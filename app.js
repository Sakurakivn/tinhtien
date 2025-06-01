document.getElementById('orderForm').addEventListener('submit', function(event) {
  event.preventDefault();

  // Lấy thông tin từ các input
  const customerName = document.getElementById('customerName').value;
  const customerClass = document.getElementById('customerClass').value;
  const fileName = document.getElementById('fileName').value;
  const pages = parseInt(document.getElementById('pages').value);
  const printType = document.getElementById('printType').value;
  const friendDiscount = document.getElementById('friendDiscount').checked;
  const discountPercentage = parseInt(document.getElementById('discount').value) || 0;

  // Kiểm tra thông tin nhập vào
  if (isNaN(pages) || pages <= 0 || !customerName) {
      alert("Vui lòng nhập số trang hợp lệ và tên khách hàng!");
      return;
  }

  let pricePerPage;
  if (pages <= 250) {
      pricePerPage = friendDiscount ? 483 : 543;
  } else if (pages <= 500) {
      pricePerPage = friendDiscount ? 463 : 520;
  } else if (pages <= 750) {
      pricePerPage = friendDiscount ? 436 : 490;
  } else {
      pricePerPage = friendDiscount ? 400 : 450;
  }

  let totalPages = printType === 'portrait' ? pages / 2 : pages / 4;
  let totalPrice = totalPages * pricePerPage;
  const friendDiscountAmount = friendDiscount ? totalPrice * 0.1 : 0;
  const programDiscountAmount = totalPrice * (discountPercentage / 100);
  const finalTotalPrice = totalPrice - friendDiscountAmount - programDiscountAmount;

  const roundedTotalPrice = Math.round(finalTotalPrice);
  const roundedTotalPriceBefore = Math.round(totalPrice);
  const roundedFriendDiscount = Math.round(friendDiscountAmount);
  const roundedProgramDiscount = Math.round(programDiscountAmount);

  const formattedTotalPrice = roundedTotalPrice.toLocaleString('vi-VN');
  const formattedTotalPriceBefore = roundedTotalPriceBefore.toLocaleString('vi-VN');
  const formattedFriendDiscount = roundedFriendDiscount.toLocaleString('vi-VN');
  const formattedProgramDiscount = roundedProgramDiscount.toLocaleString('vi-VN');

  let priceDetails = `<p><strong>Số tiền gốc:</strong> ${formattedTotalPriceBefore} VND</p>`;

  if (friendDiscountAmount > 0) {
      priceDetails += `<p><em>- ${formattedFriendDiscount} VND : Bạn bè</em></p>`;
  }
  if (programDiscountAmount > 0) {
      priceDetails += `<p><em>- ${formattedProgramDiscount} VND : Chương trình giảm ${discountPercentage}%</em></p>`;
  }

  priceDetails += `<p><strong class="totalAmount">Tổng số tiền: </strong>${formattedTotalPrice} VND</p>`;

  // Tính toán ngày nhận hàng
  const orderTime = new Date(); // Thời gian hiện tại khi tạo đơn
  let estimatedDeliveryDateStart = new Date(orderTime);
  let estimatedDeliveryDateEnd = new Date(orderTime);

  // Nếu đơn hàng được tạo sau 16:00, lùi thời gian nhận hàng
  if (orderTime.getHours() >= 16) {
    estimatedDeliveryDateStart.setDate(estimatedDeliveryDateStart.getDate() + 1); // Lùi 1 ngày
    estimatedDeliveryDateEnd.setDate(estimatedDeliveryDateEnd.getDate() + 2); // Lùi 2 ngày
  } else {
    estimatedDeliveryDateStart.setDate(estimatedDeliveryDateStart.getDate() + 1); // Ngày nhận hàng là ngày hôm sau
    estimatedDeliveryDateEnd.setDate(estimatedDeliveryDateEnd.getDate() + 1); // Ngày nhận hàng là ngày hôm sau
  }

  // Kiểm tra nếu ngày nhận hàng rơi vào Chủ Nhật thì chuyển sang Thứ Ba tuần sau
  if (estimatedDeliveryDateStart.getDay() === 0) { // Chủ Nhật là ngày 0
    estimatedDeliveryDateStart.setDate(estimatedDeliveryDateStart.getDate() + 2); // Chuyển sang Thứ Ba
    estimatedDeliveryDateEnd.setDate(estimatedDeliveryDateEnd.getDate() + 2); // Chuyển sang Thứ Ba
  }

  // Định dạng ngày nhận hàng
  const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
  const formattedStartDate = estimatedDeliveryDateStart.toLocaleDateString('vi-VN', options);
  const formattedEndDate = estimatedDeliveryDateEnd.toLocaleDateString('vi-VN', options);

  // Hiển thị chi tiết
  priceDetails += `<p><strong>Dự kiến ngày nhận hàng:</strong> ${formattedStartDate} - ${formattedEndDate}</p>`;
  priceDetails += `<button id="generateInvoice">Xuất hóa đơn</button>`; // Nút xuất hóa đơn

  // Hiển thị lên giao diện
  document.getElementById('priceDetails').innerHTML = priceDetails;

  // Lưu thông tin vào localStorage để sử dụng cho hóa đơn
  const invoiceData = {
      customerName,
      customerClass,
      fileName,
      pages,
      printType,
      totalPrice: roundedTotalPrice,
      friendDiscountAmount: roundedFriendDiscount,
      programDiscountAmount: roundedProgramDiscount,
      finalTotalPrice: roundedTotalPrice,
      totalPriceBeforeDiscount: roundedTotalPriceBefore,
      estimatedStartDate: formattedStartDate,
      estimatedEndDate: formattedEndDate, // Lưu ngày nhận hàng
      createdAt: new Date().toLocaleString('vi-VN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false // Để hiển thị theo định dạng 24 giờ
      })
  };

  localStorage.setItem('invoiceData', JSON.stringify(invoiceData));

  // Gửi dữ liệu đến Google Sheets
  fetch('https://script.google.com/macros/s/AKfycbxiJXoMIf4fffa9YOQYTVs-lVNTiQXLCww4eW744isDTsYK-wK2UFVCAUBQ61wcty4hUQ/exec', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoiceData)
  })
  .then(response => response.json())
  .then(data => {
      if (data.result === "Success") {
          // Hiển thị thông báo thành công
          alert("Hóa đơn đã được lưu thành công!");
      }
  })
  .catch(error => {
      console.error('Lỗi:', error);
  });

  // Thêm sự kiện cho nút "Xuất hóa đơn"
  document.getElementById('generateInvoice').addEventListener('click', function() {
      // Chuyển hướng đến trang hóa đơn
      window.location.href = 'invoice.html';
  });
  // Thêm sự kiện reset cho form để xóa kết quả cũ
  document.getElementById('orderForm').addEventListener('reset', function() {
    document.getElementById('priceDetails').innerHTML = '';
  });
});
