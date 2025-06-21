document.addEventListener('DOMContentLoaded', () => {
    // Hàm này phải được định nghĩa hoặc import từ file khác nếu cần
    // Giả sử nó đã có trong ui_helpers.js
    if (typeof showLoadingSpinner !== 'function') {
        window.showLoadingSpinner = function(msg) { console.log(msg); };
        window.hideLoadingSpinner = function() {};
    }

    async function fetchDataAndRenderDashboard() {
        showLoadingSpinner("Đang tải dữ liệu thống kê...");
        try {
            const response = await fetch('/api/customers');
            if (!response.ok) throw new Error('Không thể tải dữ liệu');
            const customers = await response.json();
            
            processAndRenderKPIs(customers);
            processAndRenderTopCustomers(customers);
            processAndRenderPrintTypes(customers);
            processAndRenderMonthlyStats(customers);

        } catch (error) {
            console.error("Lỗi khi tải dữ liệu cho dashboard:", error);
            document.querySelector('.dashboard-container').innerHTML = '<h1>Lỗi tải dữ liệu thống kê</h1>';
        } finally {
            hideLoadingSpinner();
        }
    }

    function processAndRenderKPIs(customers) {
        let totalOrders = 0;
        let totalRevenue = 0;
        let totalPages = 0;

        customers.forEach(customer => {
            if (customer.orders && Array.isArray(customer.orders)) {
                totalOrders += customer.orders.length;
                customer.orders.forEach(order => {
                    totalRevenue += order.finalTotalPrice || 0;
                    totalPages += order.pages || 0;
                });
            }
        });

        document.getElementById('total-customers').textContent = customers.length.toLocaleString('vi-VN');
        document.getElementById('total-orders').textContent = totalOrders.toLocaleString('vi-VN');
        document.getElementById('total-revenue').textContent = totalRevenue.toLocaleString('vi-VN');
        document.getElementById('total-pages').textContent = totalPages.toLocaleString('vi-VN');
    }

    function processAndRenderTopCustomers(customers) {
        const sortedCustomers = [...customers]
            .sort((a, b) => (b.purchaseCount || 0) - (a.purchaseCount || 0))
            .slice(0, 5); // Lấy top 5

        const labels = sortedCustomers.map(c => c.name);
        const data = sortedCustomers.map(c => c.purchaseCount || 0);
        
        const ctx = document.getElementById('top-customers-chart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Số lần mua',
                    data: data,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y', // Biểu đồ cột ngang
                responsive: true,
                scales: { x: { beginAtZero: true } }
            }
        });
    }

    function processAndRenderPrintTypes(customers) {
        let portraitCount = 0;
        let landscapeCount = 0;
        customers.forEach(c => {
            c.orders?.forEach(o => {
                if (o.printType === 'portrait') portraitCount++;
                else if (o.printType === 'landscape') landscapeCount++;
            });
        });

        const ctx = document.getElementById('print-type-chart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut', // hoặc 'pie'
            data: {
                labels: ['In Dọc (2 trang A4)', 'In Ngang (4 trang A4)'],
                datasets: [{
                    data: [portraitCount, landscapeCount],
                    backgroundColor: ['rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)'],
                    hoverOffset: 4
                }]
            },
            options: { responsive: true }
        });
    }

    function processAndRenderMonthlyStats(customers) {
        const monthlyData = {}; // Ví dụ: { '2025-05': { orders: 10, revenue: 500000 } }
        
        customers.forEach(customer => {
            customer.orders?.forEach(order => {
                const date = new Date(order.createdAt);
                if (isNaN(date.getTime())) return;
                
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = { orders: 0, revenue: 0 };
                }
                monthlyData[monthKey].orders++;
                monthlyData[monthKey].revenue += order.finalTotalPrice || 0;
            });
        });

        const sortedMonths = Object.keys(monthlyData).sort();

        const labels = sortedMonths;
        const orderData = sortedMonths.map(month => monthlyData[month].orders);
        const revenueData = sortedMonths.map(month => monthlyData[month].revenue);

        const ctx = document.getElementById('monthly-stats-chart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        type: 'line', // Biểu đồ đường cho doanh thu
                        label: 'Doanh thu (VND)',
                        data: revenueData,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        yAxisID: 'y-revenue',
                        tension: 0.1
                    },
                    {
                        type: 'bar', // Biểu đồ cột cho số đơn hàng
                        label: 'Số đơn hàng',
                        data: orderData,
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        yAxisID: 'y-orders',
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { stacked: true },
                    'y-revenue': {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Doanh thu (VND)' }
                    },
                    'y-orders': {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Số đơn hàng' },
                        grid: { drawOnChartArea: false }, // không vẽ lưới cho trục này
                        beginAtZero: true
                    }
                }
            }
        });
    }

    fetchDataAndRenderDashboard();
});
