let currentProduct = null;
let apiToken = null;

function getProductIdFromUrl() {
    const path = window.location.pathname;
    const segments = path.split('/');
    return segments[segments.length - 1];
}

function getApiToken(callback) {
    if (apiToken) {
        callback(apiToken);
        return;
    }
    
    $.ajax({
        url: '/api/method/navari_warehouse.www.api.get_token.get_api_token',
        method: 'GET',
        dataType: 'json'
    })
    .done(function(tokenResponse) {
        if (tokenResponse.message) {
            apiToken = tokenResponse.message;
            callback(apiToken);
        } else {
            callback(null);
        }
    })
    .fail(function(xhr, status, error) {
        console.error('Error fetching API token:', xhr.responseText);
        callback(null);
    });
}

function fetchProduct(productId) {
    getApiToken(function(token) {
        if (!token) {
            console.error('Failed to get API token');
            showNotification('Failed to get API token', 'error');
            showError();
            return;
        }
        
        $.ajax({
            url: `/api/resource/Product/${productId}`,
            method: 'GET',
            headers: {
                'Authorization': 'token ' + token
            },
            dataType: 'json'
        })
        .done(function(response) {
            if (response.data) {
                displayProduct(response.data);
            } else {
                showError();
            }
        })
        .fail(function(xhr, status, error) {
            console.error('Error fetching product:', error);
            showNotification('Error loading product details', 'error');
            showError();
        });
    });
}

function updateProduct(productId, data, callback) {
    getApiToken(function(token) {
        if (!token) {
            console.error('Failed to get API token');
            callback(false);
            return;
        }
        
        $.ajax({
            url: `/api/resource/Product/${productId}`,
            method: 'PUT',
            headers: {
                'Authorization': 'token ' + token,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(data),
            dataType: 'json'
        })
        .done(function(response) {
            callback(true, response);
        })
        .fail(function(xhr, status, error) {
            console.error('Error updating product:', error);
            callback(false, error);
        });
    });
}

function deleteProductApi(productId, callback) {
    getApiToken(function(token) {
        if (!token) {
            console.error('Failed to get API token');
            callback(false);
            return;
        }
        
        $.ajax({
            url: `/api/resource/Product/${productId}`,
            method: 'DELETE',
            headers: {
                'Authorization': 'token ' + token
            },
            dataType: 'json'
        })
        .done(function(response) {
            callback(true, response);
        })
        .fail(function(xhr, status, error) {
            console.error('Error deleting product:', error);
            callback(false, error);
        });
    });
}

function uploadImageAndUpdateProduct(imageFile, productData, token, callback) {
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
                updateProduct(currentProduct.name, productData, callback);
            } else {
                showNotification('Failed to upload image', 'error');
                callback(false, 'Failed to upload image');
            }
        },
        error: function(xhr, status, error) {
            console.error('Image upload error:', error);
            const errorMessage = xhr.responseJSON?.message || error;
            showNotification('Failed to upload image: ' + errorMessage, 'error');
            callback(false, errorMessage);
        }
    });
}

function displayProduct(product) {
    currentProduct = product;
    
    document.title = `${product.product_name || product.name} - Product Details`;
    $('#productTitle').text(product.product_name || product.name);
    
    $('#productName').text(product.product_name || '');
    $('#productType').text(product.product_type || 'Not specified');
    $('#productRate').text(product.rate ? `KES ${parseFloat(product.rate).toFixed(2)}` : 'Not specified');
    $('#productDescription').text(product.description || 'No description available');
    
    if (product.product_image) {
        $('#productImage').attr('src', product.product_image);
    }
    
    $('#loadingState').hide();
    $('#errorState').hide();
    $('#productContent').show();
}

function showError() {
    $('#loadingState').hide();
    $('#productContent').hide();
    $('#errorState').show();
}

function openEditModal() {
    if (!currentProduct) return;
    
    $('#editProductName').val(currentProduct.product_name || '');
    $('#editProductType').val(currentProduct.product_type || '');
    $('#editRate').val(currentProduct.rate || '');
    $('#editDescription').val(currentProduct.description || '');
    
    const currentImagePreview = document.getElementById('currentImagePreview');
    const currentImageThumb = document.getElementById('currentImageThumb');
    const imageButtonText = document.getElementById('imageButtonText');
    
    if (currentProduct.product_image) {
        currentImageThumb.src = currentProduct.product_image;
        currentImagePreview.style.display = 'block';
        imageButtonText.textContent = 'Replace Image';
    } else {
        currentImagePreview.style.display = 'none';
        imageButtonText.textContent = 'Add Image';
    }
    
    document.getElementById('editProductImage').value = '';
    document.getElementById('editImageFileName').textContent = 'No new file selected';
    
    $('#editModal').show();
}

function closeEditModal() {
    $('#editModal').hide();
    $('#editForm')[0].reset();
}

function handleImageChange(input) {
    const fileName = input.files[0] ? input.files[0].name : 'No new file selected';
    document.getElementById('editImageFileName').textContent = fileName;
}

function saveProduct() {
    if (!currentProduct) return;
    
    const formData = {
        product_name: $('#editProductName').val().trim(),
        product_type: $('#editProductType').val().trim(),
        rate: $('#editRate').val() ? parseFloat($('#editRate').val()) : null,
        description: $('#editDescription').val().trim()
    };
    
    if (!formData.product_name) {
        showNotification('Product name is required', 'error');
        $('#editProductName').focus();
        return;
    }
    
    if (!formData.product_type) {
        showNotification('Product type is required', 'error');
        $('#editProductType').focus();
        return;
    }
    
    if (!formData.rate || formData.rate <= 0) {
        showNotification('Please enter a valid rate', 'error');
        $('#editRate').focus();
        return;
    }
    
    const saveBtn = $('#editModal button:contains("Save Changes")');
    const originalText = saveBtn.text();
    saveBtn.text('Saving...').prop('disabled', true);
    
    const imageFile = $('#editProductImage')[0].files[0];
    
    getApiToken(function(token) {
        if (!token) {
            showNotification('Failed to retrieve API token', 'error');
            resetSubmitButton(saveBtn, originalText);
            return;
        }
        
        function handleUpdateResponse(success, response) {
            if (success) {
                Object.assign(currentProduct, formData);
                
                if (response && response.data && response.data.product_image) {
                    currentProduct.product_image = response.data.product_image;
                }
                
                displayProduct(currentProduct);
                closeEditModal();
                showNotification('Product updated successfully!', 'success');
            } else {
                console.error('Error updating product:', response);
                const errorMessage = response?.responseJSON?.message || response || 'Unknown error occurred';
                showNotification('Error updating product: ' + errorMessage, 'error');
            }
            resetSubmitButton(saveBtn, originalText);
        }
        
        if (imageFile) {
            uploadImageAndUpdateProduct(imageFile, formData, token, handleUpdateResponse);
        } else {
            if (currentProduct.product_image) {
                formData.product_image = currentProduct.product_image;
            }
            updateProduct(currentProduct.name, formData, handleUpdateResponse);
        }
    });
}

function resetSubmitButton(submitBtn, originalText) {
    submitBtn.prop('disabled', false).text(originalText);
}

function confirmDelete() {
    if (!currentProduct) return;
    
    $('#deleteProductName').text(currentProduct.product_name || currentProduct.name);
    $('#deleteModal').show();
}

function closeDeleteModal() {
    $('#deleteModal').hide();
}

function deleteProduct() {
    if (!currentProduct) return;
    
    const deleteBtn = $('#deleteModal button:contains("Yes, Delete")');
    const originalText = deleteBtn.text();
    deleteBtn.text('Deleting...').prop('disabled', true);
    
    deleteProductApi(currentProduct.name, function(success, response) {
        if (success) {
            showNotification('Product deleted successfully!', 'success');
            storeNotification('Product deleted successfully!', 'success');
            setTimeout(function() {
                window.location.href = '/product';
            }, 1500);
        } else {
            console.error('Error deleting product:', response);
            const errorMessage = response?.responseJSON?.message || response || 'Unknown error occurred';
            showNotification('Error deleting product: ' + errorMessage, 'error');
            resetSubmitButton(deleteBtn, originalText);
        }
    });
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

$(document).on('click', '#editModal, #deleteModal', function(e) {
    if (e.target === this) {
        if (this.id === 'editModal') {
            closeEditModal();
        } else if (this.id === 'deleteModal') {
            closeDeleteModal();
        }
    }
});

$(document).on('keydown', function(e) {
    if (e.key === 'Escape') {
        if ($('#editModal').is(':visible')) {
            closeEditModal();
        }
        if ($('#deleteModal').is(':visible')) {
            closeDeleteModal();
        }
    }
});

$(document).ready(function() {
    checkForStoredNotification();
    
    const productId = getProductIdFromUrl();
    
    if (!productId) {
        showError();
        return;
    }
    
    fetchProduct(productId);
});