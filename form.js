import { addTransaction, dbReady } from "./database.js";
import { ComboBox } from "./combobox.js";
import { EstimatedForm } from "./estimated-form.js";
import { TransactionList } from "./transactions.js";
import { ComparisonView } from "./comparison.js";
import { Toast } from "./toast.js";
import { SummaryCard } from "./summary.js";

export class Form {
    constructor() {
        this.categoryCombo = new ComboBox();
        this.selectedCategory = null;

    }

    async init() {
        await dbReady;
        await this.categoryCombo.loadCategories();

        if (this.categoryCombo.options.length > 0) {
            this.selectedCategory = this.categoryCombo.options[0].value;
            this.categoryCombo.selectedValue = this.selectedCategory;
            this.categoryCombo._updateOptions();
        }

        this.categoryCombo.onSelect = (value) => {
            this.selectedCategory = value;
        };
    }

    render() {

        
        const form = document.createElement("form");
        form.classList.add("transaction-form");

        const title = document.createElement("h2");
        title.textContent = "Transaction Form"; 
        form.prepend(title);
        title.classList.add("form-header");

        const typeGroup = document.createElement("div");
        typeGroup.classList.add("form-group");
        const typeLabel = document.createElement("label");
        typeLabel.textContent = "Type:";


        const typeSelect = document.createElement("select");
        ["Income", "Expense"].forEach(type => {
            const option = document.createElement("option");
            option.value = type.toLowerCase();
            option.textContent = type;
            typeSelect.appendChild(option);
        });

        typeGroup.appendChild(typeLabel);
        typeGroup.appendChild(typeSelect);

        const amountGroup = document.createElement("div");
        amountGroup.classList.add("form-group");
        const amountLabel = document.createElement("label");
        amountLabel.textContent = "Amount:";
        const amountInput = document.createElement("input");
        amountInput.type = "number";
        amountInput.step = "0.01";
        amountInput.required = true;
        amountGroup.appendChild(amountLabel);
        amountGroup.appendChild(amountInput);

        const dateGroup = document.createElement("div");
        dateGroup.classList.add("form-group");
        const dateLabel = document.createElement("label");
        dateLabel.textContent = "Month/Year:";
        const dateInput = document.createElement("input");
        dateInput.type = "month";
        dateInput.required = true;
        dateGroup.appendChild(dateLabel);
        dateGroup.appendChild(dateInput);

        const categoryGroup = document.createElement("div");
        categoryGroup.classList.add("form-group");
        const categoryLabel = document.createElement("label");
        categoryLabel.textContent = "Category:";
        categoryGroup.append(categoryLabel);
        categoryGroup.append(this.categoryCombo.render());

        const submitBtn = document.createElement("button");
        submitBtn.type = "submit";
        submitBtn.textContent = "Add Entry";
        submitBtn.classList.add("submitBtn-form");

        form.append(typeGroup, amountGroup, dateGroup, categoryGroup, submitBtn);

        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            let finalSelectedCategory = this.selectedCategory;
            if (!finalSelectedCategory) {
                const toast = new Toast("Please select a category");
                document.body.appendChild(toast.render());
                return;
            }
            this.selectedCategory = finalSelectedCategory;

            const monthValue = dateInput.value;
            if (!monthValue) {
                const toast = new Toast("Please select a month/year");
                document.body.appendChild(toast.render());
                return;
            }

            const [year, month] = monthValue.split("-");
            const selectedDate = new Date(parseInt(year), parseInt(month) - 1, 1);

            const entry = {
                type: typeSelect.value === "income" ? "income" : "expense",
                amount: parseFloat(amountInput.value),
                date: selectedDate.toISOString(),
                category: parseInt(finalSelectedCategory)
            };

            try {
                await addTransaction(entry);
                document.dispatchEvent(new CustomEvent("transactionAdded"));
                const toast = new Toast("Entry added successfully!");
                document.body.appendChild(toast.render());
                form.reset();
                this.selectedCategory = this.categoryCombo.options[0]?.value || null;
                if (this.categoryCombo.select) {
                    this.categoryCombo.select.value = this.selectedCategory;
                }
            } catch (error) {
                const toast = new Toast(`Error: ${error.message}`);
                document.body.appendChild(toast.render());
            }
        })
        return form;

    }
}

dbReady.then(async () => {
    const container = document.querySelector("#transactions-view .forms-container");
    
    // Create transaction form
    const transactionForm = new Form();
    await transactionForm.init();
    
    // Create estimated expenses form
    const estimatedForm = new EstimatedForm();
    await estimatedForm.init();

    // Create forms container
    const formsWrapper = document.createElement("div");
    formsWrapper.className = "forms-wrapper";
    formsWrapper.append(transactionForm.render(), estimatedForm.render());
    
    // Add to transactions view
    container.appendChild(formsWrapper);

    const summaryCard = new SummaryCard();
    summaryCard.render();

    // Tab switching logic
    document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", () => {
            // Remove active classes
            document.querySelectorAll(".tab, .tab-content").forEach(el => {
                el.classList.remove("active");
            });
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add("active");
            document.getElementById(`${tab.dataset.target}-view`).classList.add("active");
        });
    });

    const transactionContainer = document.getElementById("transactions-container");
if (!transactionContainer) {
    console.error("Transaction container not found.");
} else {
    const transactionList = new TransactionList(transactionContainer);
    transactionList.render();
    transactionList.loadTransactions();
}

const comparisonView = new ComparisonView();
comparisonView.render();
}).catch(error => {
    console.error("Initialization failed:", error);
});