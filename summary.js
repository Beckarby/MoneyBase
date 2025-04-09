import { getTransactions, getEstimatedExpenses } from "./database.js";
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

        this._bindEvents();

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