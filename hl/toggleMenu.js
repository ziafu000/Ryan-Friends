document.addEventListener('DOMContentLoaded', function () {
    // Tạo nút toggle chỉ dùng cho mobile
    var btn = document.createElement('button');
    btn.id = 'hl-toggle-btn';
    btn.className = 'btn btn-dark hl-toggle-btn';
    btn.type = 'button';
    btn.innerHTML = '<i class="fa-solid fa-sliders"></i>'; // icon FA đang dùng sẵn

    document.body.appendChild(btn);

    btn.addEventListener('click', function () {
        document.body.classList.toggle('hl-controls-open');
    });
});