$(document).ready(function () {
    $('#toggleSidebar').click(function () {
        const sidebar = $('#sidebar');
        const isHidden = sidebar.width() === 0;

        if (isHidden) {
            sidebar.css({
                width: '16rem',
                overflow: '',
                transition: 'width 0.3s ease-in-out'
            });
        } else {
            sidebar.css({
                width: '0',
                overflow: 'hidden',
                transition: 'width 0.3s ease-in-out'
            });
        }
    });
});
