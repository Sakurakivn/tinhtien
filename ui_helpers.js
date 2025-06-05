// File: ui_helpers.js (hoặc thêm vào script hiện có)

const loadingSpinner = document.getElementById('loadingSpinner');
const notificationPopup = document.getElementById('notificationPopup');
const notificationMessage = document.getElementById('notificationMessage');
let notificationTimeout;

/**
 * Hiển thị loading spinner.
 * @param {string} message - (Tùy chọn) Thông điệp hiển thị dưới spinner.
 */
function showLoadingSpinner(message = "Đang xử lý...") {
    if (loadingSpinner) {
        const pElement = loadingSpinner.querySelector('p');
        if (pElement) {
            pElement.textContent = message;
        }
        loadingSpinner.style.display = 'flex';
    }
}

/**
 * Ẩn loading spinner.
 */
function hideLoadingSpinner() {
    if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
    }
}

/**
 * Hiển thị pop-up thông báo.
 * @param {string} message - Nội dung thông báo.
 * @param {'success'|'error'|'info'} type - Loại thông báo (mặc định là 'info').
 * @param {number} duration - Thời gian hiển thị (ms), mặc định 3 giây.
 */
function showNotification(message, type = 'info', duration = 3000) {
    if (notificationPopup && notificationMessage) {
        clearTimeout(notificationTimeout); // Xóa timeout cũ nếu có

        notificationMessage.textContent = message;
        notificationPopup.className = 'notification-popup'; // Reset class
        
        if (type === 'success') {
            notificationPopup.classList.add('success');
        } else if (type === 'error') {
            notificationPopup.classList.add('error');
        }
        // Bạn có thể thêm class 'info' nếu muốn style riêng

        notificationPopup.classList.add('show');

        notificationTimeout = setTimeout(() => {
            hideNotification();
        }, duration);
    }
}

/**
 * Ẩn pop-up thông báo.
 */
function hideNotification() {
    if (notificationPopup) {
        notificationPopup.classList.remove('show');
        // Có thể thêm transitionend listener để đặt display:none sau khi animation kết thúc
        // nhưng opacity:0 và display:block rồi remove class 'show' cũng khá ổn.
        // Để mượt hơn:
        setTimeout(() => {
            if (!notificationPopup.classList.contains('show')) { // Chỉ ẩn nếu không có thông báo mới
                 notificationPopup.style.display = 'none';
            }
        }, 300); // Phải khớp với transition duration
    }
}

// Gắn sự kiện cho nút đóng trên popup nếu nó được tạo tĩnh trong HTML
// Nếu bạn đã có onclick="hideNotification()" trong HTML thì không cần dòng này.
// document.addEventListener('DOMContentLoaded', () => {
//     const closeBtn = document.querySelector('.notification-close-btn');
//     if (closeBtn) {
//         closeBtn.addEventListener('click', hideNotification);
//     }
// });
