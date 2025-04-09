import { addEstimatedExpense, dbReady, getCategories } from "./database.js";
import { ComboBox } from "./combobox.js";
import { Toast } from "./toast.js";
import { SummaryCard } from "./summary.js";

export class EstimatedForm {
    constructor() {
        this.categoryCombo = new ComboBox();
        this.selectedCategory = null;
    }

    async init() {
        await dbReady;
        await this.categoryCombo.loadCategories();
        
        // Auto-select first category if available
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
        form.classList.add("estimated-form");

        const title = document.createElement("h2");
        title.textContent = "Estimates";
        form.prepend(title);
        title.classList.add("form-header");

        const amountGroup = document.createElement("div");
        amountGroup.classList.add("form-group");
        const amountLabel = document.createElement("label");
        amountLabel.textContent = "Estimated Amount:";
        const amountInput = document.createElement("input");
        amountInput.type = "number";
        amountInput.step = "0.01";
        amountInput.min = "0";
        amountInput.required = true;
        amountGroup.append(amountLabel);
        amountGroup.append(amountInput);

        const monthGroup = document.createElement("div");
        monthGroup.classList.add("form-group");
        const monthLabel = document.createElement("label");
        monthLabel.textContent = "Month/Year:";
        const monthInput = document.createElement("input");
        monthInput.type = "month";
        monthInput.required = true;
        monthGroup.append(monthLabel, monthInput);

        const categoryGroup = document.createElement("div");
        categoryGroup.classList.add("form-group");
        const categoryLabel = document.createElement("label");
        categoryLabel.textContent = "Category:";
        categoryGroup.append(categoryLabel);
        categoryGroup.append(this.categoryCombo.render());

        

        // Submit Button
        const submitBtn = document.createElement("button");
        submitBtn.type = "submit";
        submitBtn.textContent = "Save Estimate";
        submitBtn.classList.add("submitBtn-form");

        form.append(monthGroup, categoryGroup, amountGroup, submitBtn);

        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (!this.selectedCategory) {
                const toast = new Toast("Please select a category");
                document.body.appendChild(toast.render());  
                return;
            }

            const [year, month] = monthInput.value.split("-");
            
            const estimate = {
                year: parseInt(year),
                month: parseInt(month),
                categoryId: parseInt(this.selectedCategory),
                amount: parseFloat(amountInput.value)
            };

            try {
                await addEstimatedExpense(estimate);
                
                const summaryInstance = new SummaryCard();
                await summaryInstance._updateSummary(parseInt(year), parseInt(month));

                document.dispatchEvent(new CustomEvent("estimatedAdded"));
                const toast = new Toast("Estimate saved successfully!");
                document.body.appendChild(toast.render());  
                form.reset();
            } catch (error) {
                const toast = new Toast(`Error: ${error.message}`);
                document.body.appendChild(toast.render());  
            }
        });

        return form;
    }
}