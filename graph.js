import { getEstimatedExpenses, getTransactions, getCategories } from "./database.js";

export class ExpenseComparisonChart {
    constructor() {
        this.canvas = document.createElement("canvas");
        this.canvas.id = "expenseComparisonChart";
        this.canvas.width = 600;
        this.canvas.height = 800;
        this.chart = null;
    }

    async render(container) {
        container.appendChild(this.canvas);
        await this.updateChart();
    }


    async updateChart(year = null, month = null) {
        // Get data for all months if no specific month/year provided
        const estimates = await getEstimatedExpenses(year, month);
        const transactions = await getTransactions();

        // Process data to group by month
        const monthlyData = {};

        // Process estimated expenses
        estimates.forEach(estimate => {
            const key = `${estimate.year}-${estimate.month}`;
            if (!monthlyData[key]) {
                monthlyData[key] = {
                    year: estimate.year,
                    month: estimate.month,
                    estimated: 0,
                    actual: 0
                };
            }
            monthlyData[key].estimated += estimate.amount;
        });

        if (!year || !month) {
            transactions.forEach(transaction => {
                if (transaction.type === 'expense') {
                    const date = new Date(transaction.date);
                    const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
                    
                    if (!monthlyData[key]) {
                        monthlyData[key] = {
                            year: date.getFullYear(),
                            month: date.getMonth() + 1,
                            estimated: 0,
                            actual: 0
                        };
                    }
                    monthlyData[key].actual += transaction.amount;
                }
            });
        } else {
            transactions.forEach(transaction => {
                const date = new Date(transaction.date);
                if (transaction.type === 'expense' && 
                    date.getFullYear() === year && 
                    date.getMonth() + 1 === month) {
                    
                    const key = `${year}-${month}`;
                    if (!monthlyData[key]) {
                        monthlyData[key] = {
                            year: year,
                            month: month,
                            estimated: 0,
                            actual: 0
                        };
                    }
                    monthlyData[key].actual += transaction.amount;
                }
            });
        }
        

        // Sort by year and month
        const sortedData = Object.values(monthlyData).sort((a, b) => {
            return a.year - b.year || a.month - b.month;
        });

        // Prepare chart data
        const labels = sortedData.map(item => 
            `${new Date(item.year, item.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}`
        );
        
        const estimatedData = sortedData.map(item => item.estimated);
        const actualData = sortedData.map(item => item.actual);
        const differenceData = sortedData.map(item => item.estimated - item.actual);

        // Destroy previous chart if exists
        if (this.chart) {
            this.chart.destroy();
        }

        // Create new chart
        this.chart = new Chart(this.canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Estimated Expenses',
                        data: estimatedData,
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Actual Expenses',
                        data: actualData,
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Difference',
                        data: differenceData,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        borderColor: differenceData.map(value => 
                            value >= 0 ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 159, 64, 1)'
                        ),
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.1,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Amount ($)'
                        }
                        
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Month'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('en-US', { 
                                        style: 'currency', 
                                        currency: 'USD' 
                                    }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }
}

export class CategoryPieChart {
    constructor(canvasID) {
        this.canvas = document.createElement("canvas");
        this.canvas.id = canvasID;
        this.chart = null;
        this.categories = [];
    }

    async loadCategories() {
        try {
            this.categories = await getCategories();
        } catch (error) {
            console.error("Error loading categories:", error);
        }
    }

    getCategoryName(id) {
        const category = this.categories.find(cat => cat.id === id);
        return category ? category.name : "Unknown";
    }

    async render() {
        await this.loadCategories();
        if (!this.canvas) {
            console.error("Canvas element not found in the document.")
            return;
        }
        await this.updateChart();
    }

    async updateChart() {
        await this.loadCategories();
        if (!this.canvas) return;
        const transactions = await getTransactions();
        const categoryData = transactions.reduce((acc, transaction) => {
            if (transaction.type === 'expense') {
                const categoryName = this.getCategoryName(transaction.category);
                acc[categoryName] = (acc[categoryName] || 0) + transaction.amount;
            }
            return acc;
        }, {});

        const labels = Object.keys(categoryData);
        const dataValues = Object.values(categoryData);

        if (this.chart) this.chart.destroy();

        this.chart = new Chart(this.canvas.getContext('2d'), {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: "Expenses by Category",
                    data: dataValues,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56',
                        '#4BC0C0', '#9966FF', '#FF9F40'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: false,
                        // text: 'Expenses by Category'
                    }
                }
            }
        });
    }

}