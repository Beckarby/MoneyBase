import {
  getTransactions,
  getCategories,
  deleteTransaction,
  updateTransaction,
  getEstimatedExpenses,
  updateEstimatedExpense,
  deleteEstimatedExpense,
} from "./database.js"
import { SummaryCard } from "./summary.js"
import { Toast } from "./toast.js"
import { Boton } from "./boton.js"

export class TransactionList {
  constructor(container) {
    if (!container) {
      throw new Error("A valid container element must be provided.")
    }
    this.container = container
    this.categories = []
    this.selectedMonth = "all"
    this.selectedType = "all"
    this.selectedCategory = "all"
    this.monthSelect = null
    this.typeSelect = null
    this.categorySelect = null
    this.selectedDataSource = "transactions"
    this._bindEvents()
  }

  _bindEvents() {
    document.addEventListener("transactionAdded", () => this.loadTransactions())
  }

  async loadCategories() {
    try {
      this.categories = await getCategories()
      if (this.categorySelect) {
        const currentCategoryValue = this.categorySelect.value
        this.categorySelect.innerHTML = '<option value="all">All</option>'
        this.categories.forEach((category) => {
          const option = document.createElement("option")
          option.value = category.id.toString()
          option.textContent = category.name
          this.categorySelect.appendChild(option)
        })
        if (this.categories.some((cat) => cat.id.toString() === currentCategoryValue)) {
          this.categorySelect.value = currentCategoryValue
        } else {
          this.categorySelect.value = "all"
          this.selectedCategory = "all"
        }
      }
    } catch (error) {
      console.error("Error loading categories:", error)
    }
  }

  getCategoryName(id) {
    const category = this.categories.find((cat) => cat.id === id)
    return category ? category.name : "Unknown"
  }

  async loadTransactions() {
    await this.loadCategories()

    let data
    if (this.selectedDataSource === "transactions") {
      data = await getTransactions()
    } else {
      data = await getEstimatedExpenses()
    }

    //const transactions = await getTransactions();

    const months = new Set()
    data.forEach((item) => {
      if (this.selectedDataSource === "transactions") {
        const date = new Date(item.date)
        months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`)
      } else {
        months.add(`${item.year}-${String(item.month).padStart(2, "0")}`)
      }
    })
    const sortedMonths = Array.from(months).sort((a, b) => {
      const [aYear, aMonth] = a.split("-")
      const [bYear, bMonth] = b.split("-")
      return aYear - bYear || aMonth - bMonth
    })

    if (this.monthSelect) {
      const currentValue = this.monthSelect.value
      this.monthSelect.innerHTML = '<option value="all">All</option>'
      sortedMonths.forEach((month) => {
        const [year, monthNum] = month.split("-")
        const date = new Date(year, monthNum - 1)
        const formattedMonth = date.toLocaleString("default", { month: "long", year: "numeric" })
        const option = document.createElement("option")
        option.value = month
        option.textContent = formattedMonth
        this.monthSelect.appendChild(option)
      })
      if (currentValue && (currentValue === "all" || sortedMonths.includes(currentValue))) {
        this.monthSelect.value = currentValue
      } else {
        this.monthSelect.value = "all"
        this.selectedMonth = "all"
      }
    }

    let filteredData = data
    if (this.selectedMonth !== "all") {
      const [selectedYear, selectedMonth] = this.selectedMonth.split("-")
      filteredData = data.filter((item) => {
        if (this.selectedDataSource === "transactions") {
          const date = new Date(item.date)
          return (
            date.getFullYear() === Number.parseInt(selectedYear) &&
            date.getMonth() + 1 === Number.parseInt(selectedMonth)
          )
        } else {
          return item.year === Number.parseInt(selectedYear) && item.month === Number.parseInt(selectedMonth)
        }
      })
    }
    if (this.selectedType !== "all" && this.selectedDataSource === "transactions") {
      filteredData = filteredData.filter((transaction) => transaction.type === this.selectedType)
    }

    if (this.selectedCategory !== "all") {
      const categoryId = Number.parseInt(this.selectedCategory)
      filteredData = filteredData.filter((item) =>
        this.selectedDataSource === "transactions" ? item.category === categoryId : item.categoryId === categoryId,
      )
    }

    const tbody = this.container.querySelector("tbody")
    if (!tbody) {
      console.error("Tbody element not found in the container.")
      return
    }

    if (filteredData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5">No ${this.selectedDataSource === "transactions" ? "transactions" : "estimates"} found.</td></tr>`
      return
    }

    tbody.innerHTML =
      this.selectedDataSource === "transactions"
        ? filteredData
            .map(
              (transaction) => `
            <tr>
                <td data-label="Date">${new Date(transaction.date).toLocaleDateString()}</td>
                <td data-label="Type">${transaction.type}</td>
                <td data-label="Category">${this.getCategoryName(transaction.category)}</td>
                <td data-label="Amount">$${transaction.amount.toFixed(2)}</td>
                <td data-label="Actions">
                    <button class="edit-btn" data-id="${transaction.id}">Edit</button>
                    <button class="delete-btn" data-id="${transaction.id}">Delete</button>
                </td>
            </tr>`,
            )
            .join("")
        : filteredData
            .map(
              (estimate) => `
            <tr>
                <td data-label="Month/Year">${estimate.month}/${estimate.year}</td>
                <td data-label="Category">${this.getCategoryName(estimate.categoryId)}</td>
                <td data-label="Amount">$${estimate.amount.toFixed(2)}</td>
                <td data-label="Actions">
                    <button class="edit-estimate" data-id="${estimate.id}">Edit</button>
                    <button class="delete-estimate" data-id="${estimate.id}">Delete</button>
                </td>
            </tr>`,
            )
            .join("")

    tbody.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", async (e) => {
        const id = Number.parseInt(e.target.dataset.id)
        if (isNaN(id)) {
          console.error("Invalid transaction ID:", e.target.dataset.id)
          return
        }
        const confirmCard = document.createElement("div")
        confirmCard.classList.add("confirm-card")
        const confirmMessage = document.createElement("p")
        confirmMessage.textContent = "Are you sure you want to delete this transaction?"
        confirmCard.appendChild(confirmMessage)

        const overlay = document.createElement("div")
        overlay.classList.add("overlay")
        document.body.appendChild(overlay)
        const confirmBtn = new Boton(
          "Yes",
          async () => {
            try {
              await deleteTransaction(id)
              const toast = new Toast("Transaction deleted successfully.")
              document.body.appendChild(toast.render())
              document.dispatchEvent(new CustomEvent("transactionDeleted"))
              this.loadTransactions()
            } catch (error) {
              const toast = new Toast(`Error: ${error.message}`)
              document.body.appendChild(toast.render())
            }
            document.body.removeChild(confirmCard)
            document.body.removeChild(overlay)
          },
          "#B82132",
        )

        const cancelBtn = new Boton(
          "No",
          () => {
            document.body.removeChild(confirmCard)
            document.body.removeChild(overlay)
          },
          "#4a7c59",
        )

        confirmCard.appendChild(confirmBtn.render())
        confirmCard.appendChild(cancelBtn.render())
        document.body.appendChild(confirmCard)
      })
    })
    tbody.querySelectorAll(".edit-btn").forEach((button) => {
      button.addEventListener("click", async (e) => {
        const id = Number.parseInt(e.target.dataset.id)
        try {
          const transactions = await getTransactions()
          const transaction = transactions.find((t) => t.id === id)
          const form = document.createElement("form")
          form.innerHTML = `
                            <div class="form-group">
                                <label>Date</label>
                                <input type="month" id="edit-month" value="${transaction.date.slice(0, 7)}" required>
                            </div>
                            <div class="form-group">
                                <label>Type</label>
                                <select id="edit-type">
                                    <option value="income" ${transaction.type === "income" ? "selected" : ""}>Income</option>
                                    <option value="expense" ${transaction.type === "expense" ? "selected" : ""}>Expense</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Category</label>
                                <select id="edit-category"></select>
                            </div>
                            <div class="form-group">
                                <label>Amount</label>
                                <input type="number" id="edit-amount" value="${transaction.amount}" step="0.01" required>
                            </div>
                            <button type="submit" class="submitBtn-form">Save</button>
                        `
          const categorySelect = form.querySelector("#edit-category")
          this.categories.forEach((category) => {
            const option = document.createElement("option")
            option.value = category.id
            option.textContent = category.name
            option.selected = category.id === transaction.category
            categorySelect.appendChild(option)
          })
          form.onsubmit = async (e) => {
            e.preventDefault()
            const updatedData = {
              date: new Date(form.querySelector("#edit-month").value).toISOString(),
              type: form.querySelector("#edit-type").value,
              category: Number.parseInt(categorySelect.value),
              amount: Number.parseFloat(form.querySelector("#edit-amount").value),
            }
            try {
              await updateTransaction(id, updatedData)
              this.loadTransactions()
              new SummaryCard()._updateSummary()
              new Toast("Transaction updated").render()
              dialog.close()
            } catch (error) {
              console.log("Error updating transaction:", error)
            }
          }

          const dialog = document.createElement("dialog")
          dialog.appendChild(form)
          document.body.appendChild(dialog)
          dialog.showModal()
        } catch (error) {
          console.error("Error fetching transaction:", error)
        }
      })
    })
    tbody.querySelectorAll(".delete-estimate").forEach((button) => {
      button.addEventListener("click", async (e) => {
        const id = Number.parseInt(e.target.dataset.id)
        if (isNaN(id)) {
          console.error("Invalid transaction ID:", e.target.dataset.id)
          return
        }
        const confirmCard = document.createElement("div")
        confirmCard.classList.add("confirm-card")
        const confirmMessage = document.createElement("p")
        confirmMessage.textContent = "Are you sure you want to delete this estimate?"
        confirmCard.appendChild(confirmMessage)

        const overlay = document.createElement("div")
        overlay.classList.add("overlay")
        document.body.appendChild(overlay)
        const confirmBtn = new Boton(
          "Yes",
          async () => {
            try {
              await deleteEstimatedExpense(id)
              const toast = new Toast("Estimate deleted successfully.")
              document.body.appendChild(toast.render())
              document.dispatchEvent(new CustomEvent("transactionDeleted"))
              this.loadTransactions()
            } catch (error) {
              const toast = new Toast(`Error: ${error.message}`)
              document.body.appendChild(toast.render())
            }
            document.body.removeChild(confirmCard)
            document.body.removeChild(overlay)
          },
          "#B82132",
        )

        const cancelBtn = new Boton(
          "No",
          () => {
            document.body.removeChild(confirmCard)
            document.body.removeChild(overlay)
          },
          "#4a7c59",
        )

        confirmCard.appendChild(confirmBtn.render())
        confirmCard.appendChild(cancelBtn.render())
        document.body.appendChild(confirmCard)
      })
    })
    tbody.querySelectorAll(".edit-estimate").forEach((button) => {
      button.addEventListener("click", async (e) => {
        const id = Number.parseInt(e.target.dataset.id)
        try {
          const estimates = await getEstimatedExpenses()
          const estimate = estimates.find((e) => e.id === id)
          const form = document.createElement("form")
          form.innerHTML = `
                        <div class="form-group">
                            <label>Month/Year</label>
                            <input type="month" 
                                value="${estimate.year}-${String(estimate.month).padStart(2, "0")}" 
                                required>
                        </div>
                        <div class="form-group">
                            <label>Category</label>
                            <select class="estimate-category-select"></select>
                        </div>
                        <div class="form-group">
                            <label>Amount</label>
                            <input type="number" value="${estimate.amount}" step="0.01" required>
                        </div>
                        <button type="submit" class="submitBtn-form">Save</button>
                    `
          const categorySelect = form.querySelector(".estimate-category-select")
          this.categories.forEach((category) => {
            const option = document.createElement("option")
            option.value = category.id
            option.textContent = category.name
            option.selected = category.id === estimate.categoryId
            categorySelect.appendChild(option)
          })
          form.onsubmit = async (e) => {
            e.preventDefault()
            const [year, month] = form.querySelector('input[type="month"]').value.split("-")
            const updatedData = {
              month: Number.parseInt(month),
              year: Number.parseInt(year),
              categoryId: Number.parseInt(categorySelect.value),
              amount: Number.parseFloat(form.querySelector('input[type="number"]').value),
            }

            try {
              await updateEstimatedExpense(id, updatedData)
              this.loadTransactions()
              new SummaryCard()._updateSummary()
              new Toast("Estimate updated").render()
              dialog.close()
            } catch (error) {
              console.error("Error updating estimate:", error)
            }
          }

          const dialog = document.createElement("dialog")
          dialog.appendChild(form)
          document.body.appendChild(dialog)
          dialog.showModal()
        } catch (error) {
          console.error("Error estimados: ", error)
        }
      })
    })
  }

  render() {
    const filterGroup = document.createElement("div")
    filterGroup.className = "month-selector"

    const label = document.createElement("label")
    label.textContent = "Filter by Month:"
    this.monthSelect = document.createElement("select")
    this.monthSelect.innerHTML = '<option value="all">All</option>'
    this.monthSelect.addEventListener("change", (e) => {
      this.selectedMonth = e.target.value
      this.loadTransactions()
    })
    filterGroup.appendChild(label)
    filterGroup.appendChild(this.monthSelect)
    this.container.appendChild(filterGroup)

    const typeLabel = document.createElement("label")
    typeLabel.textContent = "Filter by Type:"
    this.typeSelect = document.createElement("select")
    ;["all", "income", "expense"].forEach((type) => {
      const option = document.createElement("option")
      option.value = type
      option.textContent = type.charAt(0).toUpperCase() + type.slice(1)
      this.typeSelect.appendChild(option)
    })
    this.typeSelect.addEventListener("change", (e) => {
      this.selectedType = e.target.value
      this.loadTransactions()
    })
    filterGroup.appendChild(typeLabel)
    filterGroup.appendChild(this.typeSelect)

    const categoryLabel = document.createElement("label")
    categoryLabel.textContent = "Filter by Category:"
    this.categorySelect = document.createElement("select")
    this.categorySelect.innerHTML = '<option value="all">All</option>'
    this.categorySelect.addEventListener("change", (e) => {
      this.selectedCategory = e.target.value
      this.loadTransactions()
    })
    filterGroup.appendChild(categoryLabel)
    filterGroup.appendChild(this.categorySelect)

    const sourceFilter = document.createElement("select")
    sourceFilter.innerHTML = `
            <option value="transactions">Transactions</option>
            <option value="estimates">Estimated Expenses</option>
        `
    sourceFilter.addEventListener("change", (e) => {
      this.selectedDataSource = e.target.value
      this.loadTransactions()
      this._updateFiltersVisibility()
    })
    filterGroup.appendChild(document.createTextNode("Show: "))
    filterGroup.appendChild(sourceFilter)

    const table = document.createElement("table")
    table.innerHTML = `
            <thead>
                <tr>
                ${
                  this.selectedDataSource === "transactions"
                    ? `
                    <th>Date</th>
                    <th>Type</th>
                `
                    : `
                    <th>Month/Year</th>
                `
                }
                <th>Category</th>
                <th>Amount</th>
                <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr><td colspan="6" class="empty-state">Loading transactions...</td></tr>
            </tbody>
        `
    const scrollableDiv = document.createElement("div")
    scrollableDiv.className = "scrollable-content-table"
    scrollableDiv.appendChild(table)
    this.container.appendChild(scrollableDiv)
  }

  _updateFiltersVisibility() {
    const typeFilterContainer = this.typeSelect.parentElement
    const categoryFilterContainer = this.categorySelect.parentElement
    const monthFilterContainer = this.monthSelect.parentElement

    monthFilterContainer.style.display = "flex"

    if (this.selectedDataSource === "estimates") {
      typeFilterContainer.style.display = "none"
      categoryFilterContainer.style.display = "none"
      //typeFilterContainer.style.marginBottom = "10px"

      const thead = this.container.querySelector("thead tr")
      if (thead) {
        thead.innerHTML = `
                <th>Month/Year</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Actions</th>
            `
      }
    } else {
      typeFilterContainer.style.display = "flex"
      categoryFilterContainer.style.display = "flex"
      typeFilterContainer.style.marginBottom = "0"

      // Update the table header for transactions
      const thead = this.container.querySelector("thead tr")
      if (thead) {
        thead.innerHTML = `
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Actions</th>
            `
      }
      //thead.style.classList.add("month-selector")
    }

    // Always show the category filter
    categoryFilterContainer.style.display = "flex"
  }
}
