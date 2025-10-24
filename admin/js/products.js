$(document).ready(function() {
    $('#btnEdit').hide()
    $('#btnCancle').hide()

    if (!localStorage.getItem('loginAdmin')) {
        alert('Xin vui lòng đăng nhập');
        window.location.href = 'login.html';
    }






    $('#logout').click(function() {
        window.location.href = 'login.html';
        localStorage.removeItem('loginAdmin');
    });




    //hiển thị sản phẩm
    if (localStorage.getItem('products') != undefined && localStorage.getItem('products') != null) {
          var products = JSON.parse(localStorage.getItem('products'));   
    }else{
        var products=[];
    }
    if (products.length>0) {
        var html = '';
        for (var product of products){
            html += `
            <tr>
                <td><img src='${product.productImg}' width='200'></td>
                <td>${product.productName}</td>
                <td>${product.productUrl}</td>
                <td>
                    <button class='btn btn-primary' onclick='editProduct(${product.productId})'>Sửa</button>
                    <button class='btn btn-danger' onclick='delProduct(${product.productId})'>Xóa</button>            
                </td>
            </tr>
            `
        }
    }else{
        var html = `
                <tr align='center'>
                    <td colspan='4'>Hiện không có sản phẩm nào</td>
                </tr>
                `
    }



    $('#productData').html(html)


    //Thêm sản phẩm

    $('#btnAdd').click(function(){
        if (localStorage.getItem('products') && JSON.parse(localStorage.getItem('products') > 0)) {
            var products = JSON.parse(localStorage.getItem('products'))
            var productId = products[products.length - 1].productId + 1
        }else{
            var productId = 1
        }
        var productName = $('#productName').val()
        // var productPrice = $('#productPrice').val()
        var productImg = $('#productImg').val()
        // var productUnit = $('#productUnit').val()
        var productUrl = $('#productUrl').val()


        if(!productName){
            alert('Xin vui lòng nhập tên sản phẩm')
            return
        }

        // if(!productPrice){
        //     alert('Xin vui lòng nhập giá tiền')
        //     return
        // }

        // if(!productUnit){
        //     alert('Xin vui lòng nhập đơn vị')
        //     return
        // }


        if(!productImg){
            alert('Xin vui lòng nhập đường dẫn ảnh')
            return
        }

        if(!productUrl){
            alert('Xin vui lòng nhập đường dẫn sản phẩm')
            return
        }

        var product = {
            'productName': productName,
            // 'productPrice': productPrice,
            // 'productUnit': productUnit,
            'productImg': productImg,
            'productId': productId,
            'productUrl': productUrl
        }

        

        if (localStorage.getItem('products')) {
            var products=JSON.parse(localStorage.getItem('products'))
        }else{
            var products=[]
        }

        products.push(product)

        localStorage.setItem('products',JSON.stringify(products))
        alert('Thêm thành công')


        window.location.href = 'products.html'
    })

    $('#btnCancle').click(function(){
        $('#productName').val('')
        // $('#productPrice').val('')
        // $('#productUnit').val('')
        $('#productImg').val('')
        $('#productId').val('')
        $('#productUrl').val('')
        $('#btnEdit').hide()
        $('#btnCancle').hide()
        $('#btnAdd').show()
    })


    $('#btnEdit').click(function(){
        var productId = $('#productId').val()
        var productName = $('#productName').val()
        // var productPrice = $('#productPrice').val()
        var productImg = $('#productImg').val()
        var productUrl = $('#productUrl').val()
        // var productUnit = $('#productUnit').val()


        if(!productName){
            alert('Xin vui lòng nhập tên sản phẩm')
            return
        }

        if(!productUrl){
            alert('Xin vui lòng nhập đường dẫn sản phẩm')
            return
        }

        // if(!productPrice){
        //     alert('Xin vui lòng nhập giá tiền')
        //     return
        // }

        // if(!productUnit){
        //     alert('Xin vui lòng nhập đơn vị')
        //     return
        // }


        if(!productImg){
            alert('Xin vui lòng nhập đường dẫn ảnh')
            return
        }


        var products = JSON.parse(localStorage.getItem('products'))
        for (var item of products){
            if(item.productId==productId){
                var index = products.indexOf(item)
                products[index].productName= productName
                products[index].productUrl= productUrl
                // products[index].productPrice= productPrice
                // products[index].productUnit= productUnit
                products[index].productImg= productImg
            }
        }
     
        localStorage.setItem('products',JSON.stringify(products))
        alert('Cập nhật thành công')


        window.location.href = 'products.html'
    })

});


function delProduct(productId){
    var accept = confirm('Bạn có muốn xóa không?')
    if(accept){
    var products=JSON.parse(localStorage.getItem('products'))
    for (var item of products){
        if (item.productId == productId){
            var index = products.indexOf(item)
            products.splice(index,1)
        }
    }
    localStorage.setItem('products',JSON.stringify(products))
    alert('xóa thành công')
    window.location.href = 'products.html'
}
}

function editProduct(productId){
    var products=JSON.parse(localStorage.getItem('products'))
    for (var item of products){
        if (item.productId == productId){
            $('#productName').val(item.productName)
            // $('#productPrice').val(item.productPrice)
            // $('#productUnit').val(item.productUnit)
            $('#productUrl').val(item.productUrl)
            $('#productImg').val(item.productImg)
            $('#productId').val(productId)
            $('#btnEdit').show()
            $('#btnCancle').show()
            $('#btnAdd').hide()
        }
    }
}