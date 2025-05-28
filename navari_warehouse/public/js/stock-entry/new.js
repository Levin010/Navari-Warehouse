$(document).ready(function() {
    function collectFormData() {
        var formData = {
            doctype: 'Stock Entry',
            stock_entry_type: $('#stockEntryType').val(),
            from_section: $('#fromSection').val(),
            to_section: $('#toSection').val(),
            product: $('#product').val(),
            quantity: $('#quantity').val(),

        };

        return formData;
    }


    window.saveStockEntry = function() {
        $('.alert').remove();
        
        var formData = collectFormData();
        

        var saveButton = $('button[onclick="saveStockEntry()"]');
        var originalText = saveButton.text();
        saveButton.text('Saving...').prop('disabled', true);

        $.ajax({
            url: '/api/resource/Stock Entry',
            method: 'POST',
            contentType: 'application/json',
            headers: {
                'Authorization': 'token 434802dcea39ae6:fbeac41386fcc9f',
            },
            data: JSON.stringify(formData),
            dataType: 'json'
        })
        .done(function(response) {
            showNotification('New Stock Entry created successfully!', 'success');
            storeNotification('New Stock Entry created successfully!', 'success');

            
            $('#stockEntryType').val('');
            $('#fromSection').val('');
            $('#toSection').val('');
            $('#product').val('');
            $('#quantity').val('');
        })
        .fail(function(xhr, status, error) {
            console.error('Error creating Stock Entry:', xhr.responseText);
            
            var errorMessage = 'Failed to create Stock Entry';
            try {
                var response = JSON.parse(xhr.responseText);
                if (response.message) {
                    errorMessage = response.message;
                } else if (response.exc) {
                    errorMessage = 'Server error occurred';
                }
            } catch (e) {
            }
            
            showNotification(errorMessage, 'error');
        })
        .always(function() {
            saveButton.text(originalText).prop('disabled', false);
        });
    };

});

function showNotification(message, type) {
    checkForStoredNotification();
    const notificationClass = type === "success" ? 
        "position: fixed; top: 16px; right: 16px; padding: 16px; border-radius: 6px; color: white; background-color: #10B981; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); transition: opacity 300ms; z-index: 50;" : 
        "position: fixed; top: 16px; right: 16px; padding: 16px; border-radius: 6px; color: white; background-color: #EF4444; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); transition: opacity 300ms; z-index: 50;";
    
    const notification = $(`
        <div style="${notificationClass}">
            ${message}
        </div>
    `);
    $("body").append(notification);
    setTimeout(function () {
        notification.css("opacity", "0");
        setTimeout(function () {
            notification.remove();
        }, 300);
    }, 6000);
}

function storeNotification(message, type) {
    sessionStorage.setItem("notification_message", message);
    sessionStorage.setItem("notification_type", type);
    sessionStorage.setItem("notification_time", new Date().getTime());
}

function checkForStoredNotification() {
    const message = sessionStorage.getItem("notification_message");
    const type = sessionStorage.getItem("notification_type");
    const time = sessionStorage.getItem("notification_time");
    if (message && type && time) {
        const currentTime = new Date().getTime();
        const timeDiff = currentTime - parseInt(time);
        if (timeDiff < 6000) {
            const remainingTime = 6000 - timeDiff;
            const notificationClass = type === "success" ? 
                "position: fixed; top: 16px; right: 16px; padding: 16px; border-radius: 6px; color: white; background-color: #10B981; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); transition: opacity 300ms; z-index: 50;" : 
                "position: fixed; top: 16px; right: 16px; padding: 16px; border-radius: 6px; color: white; background-color: #EF4444; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); transition: opacity 300ms; z-index: 50;";
            
            const notification = $(`
                <div style="${notificationClass}">
                    ${message}
                </div>
            `);
            $("body").append(notification);
            setTimeout(function () {
                notification.css("opacity", "0");
                setTimeout(function () {
                    notification.remove();
                }, 300);
            }, remainingTime);
        }
        sessionStorage.removeItem("notification_message");
        sessionStorage.removeItem("notification_type");
        sessionStorage.removeItem("notification_time");
    }
}