import { getTransactions, getCategories, deleteTransaction, updateTransaction } from "./database.js";
import { SummaryCard } from "./summary.js";
import { Toast } from "./toast.js";

export class TransactionList {
    constructor(container) {
        if (!container) {
            throw new Error("A valid container element must be provided.");
        }
        this.container = container; 
        this.categories = [];
        this.selectedMonth = "all";
        this.selectedType = "all";
        this.selectedCategory = "all";
        this.monthSelect = null
        this.typeSelect = null
        this.categorySelect = null
        this._bindEvents();
    }

    _bindEvents() {
        document.addEventListener('transactionAdded', () => this.loadTransactions());
    }

    async loadCategories() {
        try {
            this.categories = await getCategories();
            if (this.categorySelect) {
                const currentCategoryValue = this.categorySelect.value;
                this.categorySelect.innerHTML = '<option value="all">All</option>';
                this.categories.forEach(category => {
                    const option = document.createElement("option");
                    option.value = category.id.toString();
                    option.textContent = category.name;
                    this.categorySelect.appendChild(option);
                });
                if (this.categories.some(cat => cat.id.toString() === currentCategoryValue)) {
                    this.categorySelect.value = currentCategoryValue;
                } else {
                    this.categorySelect.value = 'all';
                    this.selectedCategory = 'all';
                }

            }
        } catch (error) {
            console.error("Error loading categories:", error);
        }
    }

    getCategoryName(id) {
        const category = this.categories.find((cat) => cat.id === id);
        return category ? category.name : "Unknown";
    }

    async loadTransactions() {
        await this.loadCategories();
        const transactions = await getTransactions();


        const months = new Set();
        transactions.forEach(transaction => {
            const date = new Date(transaction.date);
            const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months.add(monthYear);
        });
        const sortedMonths = Array.from(months).sort((a,b) => {
            const [aYear, aMonth] = a.split('-');
            const [bYear, bMonth] = b.split('-');
            return aYear - bYear || aMonth - bMonth;
        })

        if (this.monthSelect) {
            const currentValue = this.monthSelect.value;
            this.monthSelect.innerHTML = '<option value="all">All</option>';
            sortedMonths.forEach(month => {
                const [year, monthNum] = month.split('-');
                const date = new Date(year, monthNum -1);
                const formattedMonth = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                const option = document.createElement("option");
                option.value = month;
                option.textContent = formattedMonth;
                this.monthSelect.appendChild(option);
            });
            if (currentValue && (currentValue === 'all' || sortedMonths.includes(currentValue))) {
                this.monthSelect.value = currentValue;
            } else {
                this.monthSelect.value = 'all';
                this.selectedMonth = 'all';
            }
        }

        let filteredTransactions = transactions;
        if (this.selectedMonth !== 'all') {
            const [selectedYear, selectedMonth] = this.selectedMonth.split('-');
            filteredTransactions = transactions.filter(transaction => {
                const date = new Date(transaction.date);
                return date.getFullYear() === parseInt(selectedYear) && (date.getMonth() + 1) === parseInt(selectedMonth);
            });
        }
        if (this.selectedType !== 'all') {
            filteredTransactions = filteredTransactions.filter(transaction => transaction.type === this.selectedType);
        }
        if (this.selectedCategory !== 'all') {
            const categoryId = parseInt(this.selectedCategory);
            filteredTransactions = filteredTransactions.filter(transaction => transaction.category === categoryId);
        }

        const tbody = this.container.querySelector("tbody");
        if (!tbody) {
            console.error("Tbody element not found in the container.");
            return;
        }

        if (transactions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5">No transactions found.</td></tr>`;
            return;
        }

        tbody.innerHTML = filteredTransactions.map(transaction => `
            <tr>
                <td>${new Date(transaction.date).toLocaleDateString()}</td>
                <td>${transaction.type}</td>
                <td>${this.getCategoryName(transaction.category)}</td>
                <td>$${transaction.amount.toFixed(2)}</td>
                <td>
                <button class="edit-btn" data-id="${transaction.id}">Edit</button>
                <button class="delete-btn" data-id="${transaction.id}">Delete</button>
                </td>
            </tr>`
        ).join("");

        tbody.querySelectorAll(".delete-btn").forEach((button) => {
            button.addEventListener("click", async (e) => {
                const id = parseInt(e.target.dataset.id);
                if (isNaN(id)) {
                    console.error("Invalid transaction ID:", e.target.dataset.id);
                    return;
                }
                if (confirm("You sure you want to delete this transaction?")) {
                    try {
                        await deleteTransaction(id);
                        //const summaryInstance = new SummaryCard();
                        //summaryInstance._updateSummary();
                        const toast = new Toast("Transaction deleted successfully.");
                        document.body.appendChild(toast.render());
                        document.dispatchEvent(new CustomEvent("transactionDeleted"));
                        this.loadTransactions();
                    } catch (error) {
                        const toast = new Toast(`Error: ${error.message} hola`);
                        document.body.appendChild(toast.render());
                    }
                }
            })
        })
        tbody.querySelectorAll(".edit-btn").forEach((button) => {
            button.addEventListener("click", async (e) => {
                const id = parseInt(e.target.dataset.id);
                try {
                    const transactions = await getTransactions();
                    const transaction = transactions.find(t => t.id === id);
                    const form = document.createElement('form');
                    form.innerHTML = `
                            <div class="form-group">
                                <label>Date</label>
                                <input type="month" id="edit-month" value="${transaction.date.slice(0, 7)}" required>
                            </div>
                            <div class="form-group">
                                <label>Type</label>
                                <select id="edit-type">
                                    <option value="income" ${transaction.type === 'income' ? 'selected' : ''}>Income</option>
                                    <option value="expense" ${transaction.type === 'expense' ? 'selected' : ''}>Expense</option>
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
                        `;
                        const categorySelect = form.querySelector("#edit-category");
                        this.categories.forEach(category => {
                            const option = document.createElement("option");
                            option.value = category.id;
                            option.textContent = category.name;
                            option.selected = category.id === transaction.category;
                            categorySelect.appendChild(option);
                        });
                        form.onsubmit = async (e) => {
                            e.preventDefault();
                            const updatedData = {
                                date: new Date(form.querySelector('#edit-month').value).toISOString(),
                                type: form.querySelector("#edit-type").value,
                                category: parseInt(categorySelect.value),
                                amount: parseFloat(form.querySelector("#edit-amount").value)
                            };
                            try {
                                await updateTransaction(id, updatedData);
                                this.loadTransactions();
                                new SummaryCard()._updateSummary();
                                new Toast('Transaction updated').render();
                                dialog.close();

                            } catch (error) {
                                console.log("Error updating transaction:", error);
                            }
                        }

                        const dialog = document.createElement('dialog');
                        dialog.appendChild(form);
                        document.body.appendChild(dialog);
                        dialog.showModal();
                } catch (error) {
                    console.error("Error fetching transaction:", error);
                }

            }) 
        })
    }

    render() {
        const filterGroup = document.createElement("div");
        filterGroup.className = "month-selector";

        const label = document.createElement("label");
        label.textContent = "Filter by Month:";
        this.monthSelect = document.createElement("select");
        this.monthSelect.innerHTML = '<option value="all">All</option>';
        this.monthSelect.addEventListener("change", (e) => {
            this.selectedMonth = e.target.value;
            this.loadTransactions();
        });
        filterGroup.appendChild(label);
        filterGroup.appendChild(this.monthSelect);
        this.container.appendChild(filterGroup);

        const typeLabel = document.createElement("label");
        typeLabel.textContent = "Filter by Type:";
        this.typeSelect = document.createElement("select");
        ["all", "income", "expense"].forEach(type => {
            const option = document.createElement("option");
            option.value = type;
            option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            this.typeSelect.appendChild(option);
        });
        this.typeSelect.addEventListener("change", (e) => {
            this.selectedType = e.target.value;
            this.loadTransactions();
        });
        filterGroup.appendChild(typeLabel);
        filterGroup.appendChild(this.typeSelect);

        const categoryLabel = document.createElement("label");
        categoryLabel.textContent = "Filter by Category:";
        this.categorySelect = document.createElement("select");
        this.categorySelect.innerHTML = '<option value="all">All</option>';
        this.categorySelect.addEventListener("change", (e) => {
            this.selectedCategory = e.target.value;
            this.loadTransactions();
        });
        filterGroup.appendChild(categoryLabel);
        filterGroup.appendChild(this.categorySelect);



        const table = document.createElement("table");
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr><td colspan="6" class="empty-state">Loading transactions...</td></tr>
            </tbody>
        `;
        const scrollableDiv = document.createElement("div");
        scrollableDiv.className = "scrollable-content-table";
        scrollableDiv.appendChild(table);
        this.container.appendChild(scrollableDiv);
    }
}