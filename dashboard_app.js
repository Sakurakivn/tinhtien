document.addEventListener('DOMContentLoaded', () => {

    // Hàm này đảm bảo các hàm loading/notification tồn tại nếu ui_helpers.js chưa được tải
    if (typeof showLoadingSpinner !== 'function') {
        window.showLoadingSpinner = function(msg) { console.log(msg); };
        window.hideLoadingSpinner = function() {};
        window.showNotification = function(msg, type) { console.log(`${type}: ${msg}`); };
    }

    /**
     * Hàm chính: Tải dữ liệu và khởi chạy tất cả các hàm vẽ biểu đồ.
     */
    async function fetchDataAndRenderDashboard() {
        showLoadingSpinner("Đang tải dữ liệu thống kê...");
        try {
            const response = await fetch('/api/customers');
            if (!response.ok) throw new Error('Không thể tải dữ liệu khách hàng');
            const customers = await response.json();
            
            // Chạy tất cả các hàm xử lý và render
            processAndRenderKPIs(customers);
            processAndRenderTopCustomersByRevenue(customers);
            processAndRenderPrintTypes(customers);
            processAndRenderDayOfWeekStats(customers);
            processAndRenderMonthlyStats(customers);

        } catch (error) {
            console.error("Lỗi khi tải dữ liệu cho dashboard:", error);
            document.querySelector('.dashboard-container').innerHTML = '<h1>Lỗi tải dữ liệu thống kê. Vui lòng thử lại.</h1>';
            showNotification("Lỗi tải dữ liệu!", "error");
        } finally {
            hideLoadingSpinner();
        }
    }

    /**
     * Tính toán và hiển thị các chỉ số KPI chính.
     * @param {Array} customers - Mảng dữ liệu khách hàng.
     */
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

        const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

        document.getElementById('total-customers').textContent = customers.length.toLocaleString('vi-VN');
        document.getElementById('total-orders').textContent = totalOrders.toLocaleString('vi-VN');
        document.getElementById('total-revenue').textContent = totalRevenue.toLocaleString('vi-VN');
        document.getElementById('total-pages').textContent = totalPages.toLocaleString('vi-VN');
        document.getElementById('average-order-value').textContent = Math.round(averageOrderValue).toLocaleString('vi-VN');
    }

    /**
     * Tìm top 5 khách hàng có doanh thu cao nhất và vẽ biểu đồ.
     * @param {Array} customers - Mảng dữ liệu khách hàng.
     */
    function processAndRenderTopCustomersByRevenue(customers) {
        const customerRevenues = customers.map(customer => {
            const totalRevenue = customer.orders?.reduce((sum, order) => sum + (order.finalTotalPrice || 0), 0) || 0;
            return { name: customer.name, totalRevenue };
        });

        const sortedCustomers = customerRevenues
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, 5); // Lấy top 5

        const labels = sortedCustomers.map(c => c.name);
        const data = sortedCustomers.map(c => c.totalRevenue);
        
        const ctx = document.getElementById('top-customers-chart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tổng chi tiêu (VND)',
                    data: data,
                    backgroundColor: 'rgba(255, 159, 64, 0.6)',
                    borderColor: 'rgba(255, 159, 64, 1)',
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

    /**
     * Thống kê và vẽ biểu đồ tròn tỉ lệ cách in.
     * @param {Array} customers - Mảng dữ liệu khách hàng.
     */
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
            type: 'doughnut',
            data: {
                labels: ['In Dọc', 'In Ngang'],
                datasets: [{
                    label: 'Tỉ lệ',
                    data: [portraitCount, landscapeCount],
                    backgroundColor: ['rgba(75, 192, 192, 0.7)', 'rgba(54, 162, 235, 0.7)'],
                    hoverOffset: 4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    /**
     * Thống kê số lượng đơn hàng theo ngày trong tuần.
     * @param {Array} customers - Mảng dữ liệu khách hàng.
     */
    function processAndRenderDayOfWeekStats(customers) {
        const dayCounts = Array(7).fill(0); // [Chủ Nhật, Thứ 2, ..., Thứ 7]
        
        customers.forEach(c => {
            c.orders?.forEach(o => {
                const orderDate = new Date(o.createdAt);
                if (!isNaN(orderDate.getTime())) {
                    dayCounts[orderDate.getDay()]++;
                }
            });
        });

        const ctx = document.getElementById('day-of-week-chart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
                datasets: [{
                    label: 'Tổng số đơn hàng',
                    data: dayCounts,
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    }
    
    /**
     * Thống kê doanh thu và đơn hàng theo từng tháng.
     * @param {Array} customers - Mảng dữ liệu khách hàng.
     */
    function processAndRenderMonthlyStats(customers) {
        const monthlyData = {};
        
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
            type: 'bar', // Loại biểu đồ chính
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
                        type: 'linear', display: true, position: 'left',
                        title: { display: true, text: 'Doanh thu (VND)' }
                    },
                    'y-orders': {
                        type: 'linear', display: true, position: 'right',
                        title: { display: true, text: 'Số đơn hàng' },
                        grid: { drawOnChartArea: false },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Khởi chạy quá trình tải dữ liệu và vẽ biểu đồ
    fetchDataAndRenderDashboard();
});
