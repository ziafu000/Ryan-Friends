$(document).ready(function () {
    if (localStorage.getItem('products') != undefined && localStorage.getItem('products') != null) {
        var products = JSON.parse(localStorage.getItem('products'));
    } else {
        var products = [];
    }
    if (products.length > 0) {
        var html = '';
        for (var product of products) {
            html += `
          <div class="col-lg-3 col-6 mt-3 ">
                <div class="card">
                    <img class="card-img-top" src="${product.productImg}">
                    <div class="card-body  d-flex  justify-content-center  flex-column align-items-center">
                        <p class="card-title font-weight-bold">${product.productName}</p>
                    </div>
                    <div class="d-flex  justify-content-center  flex-column align-items-center">
                        <a href="${product.productUrl}" class="btn btn-primary">Xem sản phẩm</a>
                    </div>
                </div>
            </div>            
              `
        }
    }
    $('#productData').html(html)

})