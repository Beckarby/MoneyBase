import { getCategories, dbReady, addCategory } from "./database.js";
import { Toast } from "./toast.js";

export class ComboBox {
    constructor(onSelect) {
        this.options = []
        this.onSelect = onSelect; 
        this.selectedValue = null;
    }

    async loadCategories() {
        try {
            const categories = await getCategories();
            this.options = categories.map(cat => ({
                value: cat.id.toString(),
                label: cat.name,
            }));
            return true;
        } catch (error) {
            console.error("Error loading categories:", error);
            return false;
        }
    }

    render() {
        const container = document.createElement("div");
        container.classList.add("combobox-container");

        const select = document.createElement("select");
        select.classList.add("combobox-select");

        this.select = select;

        this._updateOptions();

        const button = document.createElement("button");
        button.textContent = "Add Category";
        button.classList.add("combobox-button");

        const inputGroup = document.createElement("div");
        inputGroup.style.display = "flex";
        inputGroup.style.gap = "5px";
        inputGroup.style.marginLeft = "10px";

        button.addEventListener("click", async () => {

            if (container.contains(inputGroup)) return

            const input = document.createElement("input");
            input.type = "text";
            input.placeholder = "New Category";
            input.style.padding = "5px";
            input.style.borderRadius = "8px";
            input.style.border = "1px solid #ccc";

            const submitBtn = document.createElement("button");
            submitBtn.textContent = "✓";
            submitBtn.style.backgroundColor = "#4CAF50";
            submitBtn.style.color = "white";
            submitBtn.style.border = "none";
            submitBtn.style.borderRadius = "8px";
            submitBtn.style.padding = "5px 10px";
            submitBtn.style.cursor = "pointer";

            inputGroup.replaceChildren(input, submitBtn);
            container.appendChild(inputGroup);
            input.focus();

            const handleSubmit = async () => {
                const name = input.value.trim();
                if (!name) {
                    const toast = new Toast("Please enter a category name.");
                    document.body.appendChild(toast.render());
                }
                try {
                    await addCategory(name);
                    await this.refresh();
                    inputGroup.remove();
                } catch (error) {
                    const errorToast = new Toast(`Error: ${error.message}`);
                    document.body.appendChild(errorToast.render());
                    input.focus();
                }
            };

            submitBtn.addEventListener("click", handleSubmit);
            input.addEventListener("keypress", (event) => {
                if (event.key === "Enter") {
                    handleSubmit();
                }
            });
        })


        select.addEventListener("change", (event) => {
            this.selectedValue = event.target.value
            if (this.onSelect) {
                this.onSelect(this.selectedValue);
            }
        });

        container.appendChild(select);
        container.appendChild(button);
        return container;
    }

    _updateOptions() {

        if (!this.select) {
            const toast = new Toast("Select element is not defined.");
            document.body.appendChild(toast.render());
            return;
        }

        this.select.innerHTML = '';

        this.options.forEach(option => {
            const opt = document.createElement("option");
            opt.value = option.value;
            opt.textContent = option.label;
            // Preselect basically
            opt.selected = option.value === this.selectedValue;
            this.select.appendChild(opt);
        });
    }

    async refresh() {
        await this.loadCategories();
        this._updateOptions();
    }
}

