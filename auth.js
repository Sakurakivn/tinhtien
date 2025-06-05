// File: auth.js

// KHÔNG CÒN MẬT KHẨU Ở ĐÂY NỮA
// const CORRECT_PASSWORD = "admin123"; 

const AUTH_KEY = 'isAuthenticated';

/**
 * Kiểm tra xem người dùng đã xác thực chưa.
 * @returns {boolean} True nếu đã xác thực, ngược lại là false.
 */
function isAuthenticated() {
    return sessionStorage.getItem(AUTH_KEY) === 'true';
}

/**
 * Xử lý việc đăng nhập bằng cách gọi API.
 * @param {string} password - Mật khẩu người dùng nhập vào.
 * @param {function} onSuccess - Callback sẽ được gọi khi đăng nhập thành công.
 * @param {function} onFailure - Callback sẽ được gọi khi đăng nhập thất bại.
 */
async function handleLogin(password, onSuccess, onFailure) {
    try {
        console.log("[Auth.js] Đang gửi yêu cầu đăng nhập đến API...");
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: password }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log("[Auth.js] API xác nhận đăng nhập thành công.");
            sessionStorage.setItem(AUTH_KEY, 'true');
            if (onSuccess && typeof onSuccess === 'function') {
                onSuccess();
            }
        } else {
            console.warn("[Auth.js] API báo đăng nhập thất bại:", data.message);
            if (onFailure && typeof onFailure === 'function') {
                onFailure(data.message || 'Mật khẩu không đúng hoặc có lỗi xảy ra.');
            }
        }
    } catch (error) {
        console.error("[Auth.js] Lỗi khi gọi API đăng nhập:", error);
        if (onFailure && typeof onFailure === 'function') {
            onFailure('Không thể kết nối đến máy chủ xác thực. Vui lòng thử lại.');
        }
    }
}

/**
 * Xử lý đăng xuất.
 */
function handleLogout() {
    sessionStorage.removeItem(AUTH_KEY);
    window.location.href = 'index.html'; 
}

/**
 * Bảo vệ một trang. Nếu chưa xác thực, chuyển hướng đến trang index.html.
 */
function protectPage() {
    if (!isAuthenticated()) {
        window.location.href = 'index.html'; 
    }
}

/**
 * Hiển thị form đăng nhập trên trang index.html hoặc nội dung chính.
 * @param {string} mainContainerId - ID của div chứa nội dung chính.
 * @param {string} loginContainerId - ID của div chứa form đăng nhập.
 */
function setupIndexPageAuth(mainContainerId, loginContainerId) {
    const mainContainer = document.getElementById(mainContainerId);
    const loginContainer = document.getElementById(loginContainerId);
    const loginForm = loginContainer ? loginContainer.querySelector('#loginForm') : null;
    const passwordInput = loginContainer ? loginContainer.querySelector('#password') : null;
    const loginMessage = loginContainer ? loginContainer.querySelector('#loginMessage') : null;
    const logoutButton = document.getElementById('logoutBtn'); // Lấy nút logout

    if (!mainContainer || !loginContainer || !loginForm || !passwordInput || !loginMessage) {
        console.error("Lỗi: Không tìm thấy các element cần thiết cho việc xác thực trên trang index.");
        if(mainContainer) mainContainer.style.display = 'none';
        if(loginContainer) loginContainer.style.display = 'block'; // Fallback hiển thị form login
        return;
    }

    function showMainContent() {
        mainContainer.style.display = 'block';
        loginContainer.style.display = 'none';
        if (logoutButton) logoutButton.style.display = 'inline-flex'; // Hiện nút logout
    }

    function showLoginForm() {
        mainContainer.style.display = 'none';
        loginContainer.style.display = 'block';
        if (logoutButton) logoutButton.style.display = 'none'; // Ẩn nút logout
        if (loginMessage) loginMessage.textContent = ''; // Xóa thông báo lỗi cũ
        if (passwordInput) passwordInput.value = ''; // Xóa mật khẩu đã nhập
    }

    if (isAuthenticated()) {
        showMainContent();
    } else {
        showLoginForm();
        loginForm.onsubmit = async function(event) { // Gán lại onsubmit để tránh lặp listener
            event.preventDefault();
            if (loginMessage) loginMessage.textContent = 'Đang xử lý...';
            const enteredPassword = passwordInput.value;
            
            await handleLogin(enteredPassword, 
                () => { // onSuccess
                    showMainContent();
                },
                (errorMessage) => { // onFailure
                    if (loginMessage) loginMessage.textContent = errorMessage;
                    if (passwordInput) {
                        passwordInput.value = '';
                        passwordInput.focus();
                    }
                }
            );
        };
    }
    // Xử lý nút đăng xuất (đã có trong index.html, chỉ cần đảm bảo nó hoạt động)
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
}
