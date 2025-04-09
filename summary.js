import { getTransactions, getEstimatedExpenses, getCategories } from "./database.js";
import { Toast } from "./toast.js";

export class SummaryCard {
    constructor() {
        this.container = document.querySelector(".summary-cards");
        if (!this.container) {
            console.error("Summary container not found in the document.")
            return
        }
        
        this.currentDate = new Date();
        this.monthInput = null;
        this.categories = [];
        this.downloadButton = null;

        this._bindEvents();

    }

    async loadCategories() {
        try {
            this.categories = await getCategories();
        } catch (error) {
            console.error("Error loading categories:", error);
            this.categories = [];
        }
    }

    _getCategoryName(id) {
        const category = this.categories.find((cat) => cat.id === id);
        return category ? category.name : "Unknown";
    }



    _bindEvents() {
        document.addEventListener("transactionAdded", () => this._handleDataChange())
        document.addEventListener("transactionUpdated", () => this._handleDataChange())
        document.addEventListener("transactionDeleted", () => this._handleDataChange())

        document.addEventListener("estimatedAdded", () => this._handleDataChange())
        document.addEventListener("estimatedUpdated", () => this._handleDataChange())
        document.addEventListener("estimatedDeleted", () => this._handleDataChange())
    }

    _handleDataChange() {
        if (this.monthInput && this.monthInput.value) {
            const [year, month] = this.monthInput.value.split("-");
            this._updateSummary(parseInt(year), parseInt(month));
        } else {
            this._updateSummary(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1);
        }
    }

    async _getTransactionsByMonth(year, month) {
        try {
            const allTransactions = await getTransactions();
            return allTransactions.filter(transaction => {
            const date = new Date(transaction.date);
            return date.getFullYear() === year && date.getMonth() + 1 === month;
            })
        } catch (error) {
            console.error("Error fetching transactions:", error);
            return [];
        }
        
    }

    _createCard(title, amount, IsIncome = false) {
        const card = document.createElement("div");
        card.className = "summary-card";
        card.innerHTML = `
            <h4>${title}</h4>
            <div class="amount ${IsIncome ? 'income' : 'expense'}">
            $${amount.toFixed(2)}
            </div>
        `;
        return card;
    }

    async _updateSummary(year, month) {
        if (!this.container) return;
        try {
            const transactions = await this._getTransactionsByMonth(year, month);
            const estimated = await getEstimatedExpenses(year, month);

            const totals = transactions.reduce((acc, transaction) => {
                if (transaction.type === "income") {
                    acc.income += transaction.amount;
                } else {
                    acc.expense += transaction.amount;
                }
                return acc;
            }, {income: 0, expense: 0});

            const estimatedTotal = estimated.reduce((total, item) => {
                return total + item.amount;
            }, 0);

            this.container.querySelectorAll(".summary-card").forEach(card => card.remove());

            const monthSelectorWrapper = this.container.querySelector(".summary-container");
            const targetElement = monthSelectorWrapper || this.container;

            targetElement.appendChild(this._createCard("Total Income", totals.income, true));
            targetElement.appendChild(this._createCard("Total Expenses", totals.expense, false));
            targetElement.appendChild(this._createCard("Estimated Expenses", estimatedTotal, false));
            //targetElement.appendChild(this._createCard("Difference", totals.income - totals.expense, false));

        } catch (error) {
            console.error("Error updating summary:", error);
        }
    }

    async _generateReport() {
        await this.loadCategories();
        const transactions = await this._getTransactionsByMonth();
        const estimated = await getEstimatedExpenses();

        const totals = transactions.reduce((acc, t) => {
            acc[t.type] = (acc[t.type] || 0) + t.amount;
            return acc;
        }, { income: 0, expense: 0 });
        const estimatedTotal = estimated.reduce((sum, e) => sum + e.amount, 0);

        let reportContent = `"Monthly Financial Report for <span class="math-inline">\{year\}\-</span>{String(month).padStart(2, '0')}"\n\n`;
        reportContent += `"Summary"\n`;
        reportContent += `"Category","Amount"\n`;
        reportContent += `"Total Income: ",${totals.income.toFixed(2)}\n`;
        reportContent += `"Total Expenses:",${totals.expense.toFixed(2)}\n`;
        reportContent += `"Estimated Expenses:",${estimatedTotal.toFixed(2)}\n`;
        reportContent += `"Net (Income - Expenses): ",${(totals.income - totals.expense).toFixed(2)}\n\n`;

        if (transactions.length > 0) {
            reportContent += `"Detailed Transactions"\n`;
            reportContent += `"Date","Type","Category","Amount"\n`;
            transactions.forEach(t => {
                const dateStr = new Date(t.date).toLocaleDateString();
                const categoryName = this._getCategoryName(t.category);
                reportContent += `"<span class="math-inline">\{dateStr\}","</span>{t.type}","<span class="math-inline">\{categoryName\}",</span>{t.amount.toFixed(2)}\n`;
            });
            reportContent += `\n`;
        } else {
            reportContent += `"No transactions recorded for this month."\n\n`;
        }

        if (estimated.length > 0) {
            reportContent += `"Estimated Expenses Breakdown"\n`;
            reportContent += `"Category","Amount"\n`;
            estimated.forEach(e => {
                const categoryName = this._getCategoryName(e.categoryId);
                reportContent += `"<span class="math-inline">\{categoryName\}",</span>{e.amount.toFixed(2)}\n`;
            });
        } else {
             reportContent += `"No estimated expenses recorded for this month."\n`;
        }

        return reportContent;
    }

    _downloadReport(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' }); // Use text/csv for CSV
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); 
    }


    render() {
        if (!this.container) return;

        this.container.innerHTML = ""; 

        const wrapper = document.createElement("div");
        wrapper.className = "summary-container";

        const monthGroup = document.createElement("div");
        monthGroup.className = "month-selector";

        const monthInput = document.createElement("input");
        this.monthInput = monthInput;
        monthInput.type = "month";
        monthInput.value = `${this.currentDate.getFullYear()}-${String(this.currentDate.getMonth() + 1).padStart(2, '0')}`;

        monthInput.addEventListener("change", () => {
            const [year, month] = monthInput.value.split("-");
            this._updateSummary(parseInt(year), parseInt(month));
        });

        monthGroup.appendChild(monthInput);

        this.downloadButton = document.createElement("button");
        this.downloadButton.textContent = "Download Report";
        this.downloadButton.className = "combobox-button"; // Reuse existing button style or create a new one
         this.downloadButton.style.marginLeft = "10px"; // Add some space

         // Add Event Listener for Download Button
        this.downloadButton.addEventListener("click", async () => {
            if (!this.monthInput || !this.monthInput.value) {
                 const toast = new Toast("Please select a month first.");
                 document.body.appendChild(toast.render());
                 return;
            }
            const [year, month] = this.monthInput.value.split("-");
            try {
                this.downloadButton.textContent = "Generating..."; 
                this.downloadButton.disabled = true;
                const reportContent = await this._generateReport(parseInt(year), parseInt(month));
                const filename = `financial_report_${year}_${month}.txt`; // CSV filename
                this._downloadReport(reportContent, filename);
            } catch (error) {
                console.error("Error generating report:", error);
                const toast = new Toast("Failed to generate report.");
                document.body.appendChild(toast.render());
            } finally {
                this.downloadButton.textContent = "Download Report"; 
                this.downloadButton.disabled = false;
            }

        });
         monthGroup.appendChild(this.downloadButton); // Add button next to month input



        wrapper.appendChild(monthGroup);

        this.container.appendChild(wrapper);
        //this.container.innerHTML = "";
        
        this._updateSummary(
            this.currentDate.getFullYear(), 
            this.currentDate.getMonth() + 1
        );
        return wrapper;
    }

}

export async function getCategorySpending(year, month) {
    const transactions = await getTransactions();
    return transactions.filter(t => 
      new Date(t.date).getFullYear() === year &&
      new Date(t.date).getMonth()+1 === month
    ).reduce((acc, t) => {
      const cat = getCategoryName(t.category);
      acc[cat] = (acc[cat] || 0) + t.amount;
      return acc;
    }, {});
  }