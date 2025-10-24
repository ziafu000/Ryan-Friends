$(document).ready(function() {
    $('#signIn').click(function() {
        var username = $('#username').val();
        var password = $('#password').val();

        if (username == 'admin' && password == 'admin') {
            window.location.href = 'products.html';
            localStorage.setItem('loginAdmin', 1);
        } else {
            alert('Tài khoản/Mật khẩu không đúng, vui lòng thử lại');
        }
    });

    // Nhấn enter trên bàn phím
    $(document).on('keypress',function(e) {
        if (e.which == 13) {
            var username = $('#username').val();
            var password = $('#password').val();

            if (username == 'admin' && password == 'admin') {
                window.location.href = 'products.html';
                localStorage.setItem('loginAdmin', 1);
            } else {
                alert('Tài khoản/Mật khẩu không đúng, vui lòng thử lại');
            }
        }
    });
});