let currentProduct = null;
let apiToken = null;

// Get product code from URL path
function getProductIdFromUrl() {
    const path = window.location.pathname;
    const segments = path.split('/');
    return segments[segments.length - 1];
}

// Get API token
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

// Fetch product details
function fetchProduct(productId) {
    getApiToken(function(token) {
        if (!token) {
            console.error('Failed to get API token');
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
            showError();
        });
    });
}

// Update product
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

// Delete product
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

// Display product details
function displayProduct(product) {
    currentProduct = product;
    
    // Update page title
    document.title = `${product.product_name || product.name} - Product Details`;
    $('#productTitle').text(product.product_name || product.name);
    
    // Update product details
    $('#productName').text(product.product_name || '');
    $('#productType').text(product.product_type || 'Not specified');
    $('#productRate').text(product.rate ? `KES ${parseFloat(product.rate).toFixed(2)}` : 'Not specified');
    $('#productDescription').text(product.description || 'No description available');
    
    // Update product image
    if (product.product_image) {
        $('#productImage').attr('src', product.product_image);
    }
    
    // Show content and hide loading
    $('#loadingState').hide();
    $('#errorState').hide();
    $('#productContent').show();
}

// Show error state
function showError() {
    $('#loadingState').hide();
    $('#productContent').hide();
    $('#errorState').show();
}

// Open edit modal
function openEditModal() {
    if (!currentProduct) return;
    
    // Populate form with current values
    $('#editProductName').val(currentProduct.product_name || '');
    $('#editProductImage').val(currentProduct.product_image || '');
    $('#editProductType').val(currentProduct.product_type || '');
    $('#editRate').val(currentProduct.rate || '');
    $('#editDescription').val(currentProduct.description || '');
    
    $('#editModal').show();
}

// Close edit modal
function closeEditModal() {
    $('#editModal').hide();
    // Clear form
    $('#editForm')[0].reset();
}

// Save product changes
function saveProduct() {
    if (!currentProduct) return;
    
    // Get form data
    const formData = {
        product_name: $('#editProductName').val().trim(),
        product_image: $('#editProductImage').val().trim(),
        product_type: $('#editProductType').val().trim(),
        rate: $('#editRate').val() ? parseFloat($('#editRate').val()) : null,
        description: $('#editDescription').val().trim()
    };
    
    // Validate required fields
    if (!formData.product_name) {
        alert('Product name is required');
        $('#editProductName').focus();
        return;
    }
    
    // Show loading state
    const saveBtn = $('#editModal button:contains("Save Changes")');
    const originalText = saveBtn.text();
    saveBtn.text('Saving...').prop('disabled', true);
    
    updateProduct(currentProduct.name, formData, function(success, response) {
        if (success) {
            // Update current product data
            Object.assign(currentProduct, formData);
            
            // Refresh display
            displayProduct(currentProduct);
            
            // Close modal
            closeEditModal();
            
            // Show success message
            alert('Product updated successfully!');
        } else {
            console.error('Error updating product:', response);
            alert('Error updating product. Please try again.');
        }
        
        // Reset button
        saveBtn.text(originalText).prop('disabled', false);
    });
}

// Confirm delete
function confirmDelete() {
    if (!currentProduct) return;
    
    $('#deleteProductName').text(currentProduct.product_name || currentProduct.name);
    $('#deleteModal').show();
}

// Close delete modal
function closeDeleteModal() {
    $('#deleteModal').hide();
}

// Delete product
function deleteProduct() {
    if (!currentProduct) return;
    
    // Show loading state
    const deleteBtn = $('#deleteModal button:contains("Yes, Delete")');
    const originalText = deleteBtn.text();
    deleteBtn.text('Deleting...').prop('disabled', true);
    
    deleteProductApi(currentProduct.name, function(success, response) {
        if (success) {
            alert('Product deleted successfully!');
            // Redirect to product list
            window.location.href = '/product';
        } else {
            console.error('Error deleting product:', response);
            alert('Error deleting product. Please try again.');
            deleteBtn.text(originalText).prop('disabled', false);
        }
    });
}

// Handle modal clicks (close on backdrop click)
$(document).on('click', '#editModal, #deleteModal', function(e) {
    if (e.target === this) {
        if (this.id === 'editModal') {
            closeEditModal();
        } else if (this.id === 'deleteModal') {
            closeDeleteModal();
        }
    }
});

// Handle escape key
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

// Initialize page
$(document).ready(function() {
    const productId = getProductIdFromUrl();
    
    if (!productId) {
        showError();
        return;
    }
    
    fetchProduct(productId)
        .then(function(response) {
            if (response.data) {
                displayProduct(response.data);
            } else {
                showError();
            }
        })
        .catch(function(xhr, status, error) {
            console.error('Error fetching product:', error);
            showError();
        });
});