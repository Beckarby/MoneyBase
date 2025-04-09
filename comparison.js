import { getEstimatedExpenses } from "./database.js";
import { ExpenseComparisonChart } from "./graph.js";
import { getCategorySpending } from "./summary.js";

export class ComparisonView {
    constructor() {
        this.container = document.querySelector(".comparison-grid");
        this.chart = new ExpenseComparisonChart();
        
        
        
    }

    async render() {
        try {
            // Clear existing content
            const chartContainer = document.querySelector("#chart-container");
            chartContainer.innerHTML = "";
            
            
            // Add month selector
            const monthGroup = document.createElement("div");
            monthGroup.className = "month-selector";
            
            const monthInput = document.createElement("input");
            monthInput.type = "month";
            const currentDate = new Date();
            monthInput.value = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            
            monthInput.addEventListener("change", async () => {
                try {
                    const [year, month] = monthInput.value.split("-");
                    await this.chart.updateChart(parseInt(year), parseInt(month));
                } catch (error) {
                    console.log("Failed to load data for selected month");
                }
            });

            const allMonthsBtn = document.createElement("button");
            allMonthsBtn.textContent = "All Months";
            allMonthsBtn.addEventListener("click", async () => {
                try {
                    await this.chart.updateChart();
                    monthInput.value = "";
                } catch (error) {
                    console.log("Failed to load all months data");
                }
            });

            monthGroup.append(monthInput, allMonthsBtn);
            this.container.append(monthGroup)
            
            // Render the chart
            await this.chart.render(chartContainer);
            const categoryData = await getCategorySpending(2023, 11);
            const pieCanvas = document.createElement('canvas');
            chartContainer.appendChild(pieCanvas);
        
            new Chart(pieCanvas.getContext('2d'), {
                type: 'pie',
                data: {
                    labels: Object.keys(categoryData),
                    datasets: [{
                        data: Object.values(categoryData),
                        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56']
                    }]
                }
            });
            } catch (error) {
                console.log("Failed to initialize comparison view");
            }

        
            }

    
}