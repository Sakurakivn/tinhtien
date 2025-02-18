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
  priceDetails += `<button id="generateInvoice">Xuất hóa đơn</button>`;

  document.getElementById('priceDetails').innerHTML = priceDetails;

  // Lưu thông tin vào localStorage để sử dụng cho hóa đơn
  localStorage.setItem('invoiceData', JSON.stringify({
      customerName,
      customerClass,
      fileName,
      pages,
      printType,
      totalPrice: roundedTotalPrice,
      friendDiscountAmount: roundedFriendDiscount,
      programDiscountAmount: roundedProgramDiscount,
      finalTotalPrice: roundedTotalPrice,
      totalPriceBeforeDiscount: roundedTotalPriceBefore // Lưu số tiền gốc
  }));

  // Thêm sự kiện cho nút "Xuất hóa đơn"
  document.getElementById('generateInvoice').addEventListener('click', function() {
      window.location.href = 'invoice.html';
  });
});
