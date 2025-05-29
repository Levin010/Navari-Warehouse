$(document).ready(function() {
    $('#productImage').on('change', function() {
        const fileName = this.files[0] ? this.files[0].name : 'No file selected';
        $('#imageFileName').text(fileName);
    });

    $('#productForm').on('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData();
        const productName = $('#productName').val().trim();
        const productType = $('#productType').val();
        const rate = $('#rate').val();
        const description = $('#description').val().trim();
        const imageFile = $('#productImage')[0].files[0];
        
        if (!productName) {
            showNotification('Product name is required', 'error');
            return;
        }
        
        if (!productType) {
            showNotification('Product type is required', 'error');
            return;
        }
        
        if (!rate || rate <= 0) {
            showNotification('Please enter a valid rate', 'error');
            return;
        }
        
        const submitBtn = $('button[type="submit"]');
        const originalText = submitBtn.text();
        submitBtn.prop('disabled', true).text('Creating...');
        
        const productData = {
            product_name: productName,
            product_type: productType,
            rate: parseFloat(rate),
            description: description
        };
        
        getApiToken(function(token) {
            if (token) {
                if (imageFile) {
                    uploadImageAndCreateProduct(imageFile, productData, token, submitBtn, originalText);
                } else {
                    createProduct(productData, token, submitBtn, originalText);
                }
            } else {
                showNotification('Failed to retrieve API token', 'error');
                resetSubmitButton(submitBtn, originalText);
            }
        });
    });
});

function getApiToken(callback) {
    $.ajax({
        url: '/api/method/navari_warehouse.www.api.get_token.get_api_token',
        method: 'GET',
        dataType: 'json'
    })
    .done(function(tokenResponse) {
        callback(tokenResponse.message);
    })
    .fail(function(xhr, status, error) {
        console.error('Error fetching API token:', xhr.responseText);
        callback(null);
    });
}

function uploadImageAndCreateProduct(imageFile, productData, token, submitBtn, originalText) {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('is_private', 0);
    formData.append('folder', 'Home/Attachments');

    $.ajax({
        url: '/api/method/upload_file',
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        headers: {
            'Authorization': 'token ' + token
        },
        success: function(response) {
            if (response.message) {
                productData.product_image = response.message.file_url;
                createProduct(productData, token, submitBtn, originalText);
            } else {
                showNotification('Failed to upload image', 'error');
                resetSubmitButton(submitBtn, originalText);
            }
        },
        error: function(xhr, status, error) {
            console.error('Image upload error:', error);
            showNotification('Failed to upload image: ' + (xhr.responseJSON?.message || error), 'error');
            resetSubmitButton(submitBtn, originalText);
        }
    });
}

function createProduct(productData, token, submitBtn, originalText) {
    $.ajax({
        url: '/api/resource/Product',
        type: 'POST',
        data: JSON.stringify(productData),
        contentType: 'application/json',
        headers: {
            'Authorization': 'token ' + token
        },
        success: function(response) {
            if (response.data) {
                showNotification('Product created successfully!', 'success');
                $('#productForm')[0].reset();
                $('#imageFileName').text('No file selected');
                storeNotification('Product created successfully!', 'success');
                setTimeout(function() {
                    window.location.href = '/app/product/';
                }, 1500);
            } else {
                showNotification('Product created but response format unexpected', 'error');
            }
            resetSubmitButton(submitBtn, originalText);
        },
        error: function(xhr, status, error) {
            console.error('Product creation error:', error);
            let errorMessage = 'Failed to create product';

            if (xhr.responseJSON && xhr.responseJSON.message) {
                errorMessage += ': ' + xhr.responseJSON.message;
            }

            showNotification(errorMessage, 'error');
            resetSubmitButton(submitBtn, originalText);
        }
    });
}

function resetSubmitButton(submitBtn, originalText) {
    submitBtn.prop('disabled', false).text(originalText);
}

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