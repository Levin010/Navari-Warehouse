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

    function validateForm() {
        var stockEntryType = $('#stockEntryType').val();
        var fromSection = $('#fromSection').val();
        var toSection = $('#toSection').val();

        if (stockEntryType === 'Consume') {
            if (!fromSection) {
                return 'From Section should not be empty for Consume type';
            }
            if (toSection) {
                return 'To Section should be empty for Consume type';
            }
        } else if (stockEntryType === 'Transfer') {
            if (!fromSection) {
                return 'From Section should not be empty for Transfer type';
            }
            if (!toSection) {
                return 'To Section should not be empty for Transfer type';
            }
            if (fromSection === toSection) {
                return 'From Section and To Section cannot have the same value for Transfer type';
            }
        } else if (stockEntryType === 'Receipt') {
            if (fromSection) {
                return 'From Section should be empty for Receipt type';
            }
            if (!toSection) {
                return 'To Section should not be empty for Receipt type';
            }
        }

        return null;
    }

    function validateStock(callback) {
        var stockEntryType = $('#stockEntryType').val();
        var fromSection = $('#fromSection').val();
        var toSection = $('#toSection').val();
        var product = $('#product').val();
        var quantity = parseInt($('#quantity').val()) || 0;

        var validationPromises = [];

        if (stockEntryType === 'Consume' || stockEntryType === 'Transfer') {
            var sourcePromise = $.ajax({
                url: '/api/resource/Warehouse Product Stock',
                method: 'GET',
                data: {
                    filters: JSON.stringify([
                        ["warehouse_section", "=", fromSection],
                        ["product", "=", product]
                    ]),
                    fields: JSON.stringify(["name", "warehouse_section", "product", "quantity"])
                }
            }).then(function(response) {
                console.log('Source stock response:', response);
                if (!response.data || response.data.length === 0) {
                    console.log('No stock record found for:', fromSection, product);
                    return 'Not enough stock to complete this transaction';
                }
                var stockRecord = response.data[0];
                console.log('Full stock record:', stockRecord);
                console.log('Available fields:', Object.keys(stockRecord));
                var currentStock = stockRecord.quantity || 0;
                console.log('Current stock:', currentStock, 'Requested:', quantity);
                if (currentStock === 0 || currentStock < quantity) {
                    return 'Not enough stock to complete this transaction';
                }
                return null;
            }).catch(function(xhr, status, error) {
                console.error('Error fetching source stock:', xhr.responseText);
                return 'Not enough stock to complete this transaction';
            });
            validationPromises.push(sourcePromise);
        }

        if (stockEntryType === 'Transfer' || stockEntryType === 'Receipt') {
            var destinationPromise = $.ajax({
                url: '/api/resource/Warehouse Product Stock',
                method: 'GET',
                data: {
                    filters: JSON.stringify([
                        ["warehouse_section", "=", toSection],
                        ["product", "=", product]
                    ]),
                    fields: JSON.stringify(["name", "warehouse_section", "product", "quantity"])
                }
            }).then(function(response) {
                console.log('Destination stock response:', response);
                var currentStock = 0;
                if (response.data && response.data.length > 0) {
                    currentStock = response.data[0].quantity || 0;
                }
                console.log('Destination current stock:', currentStock, 'Adding:', quantity, 'Total would be:', currentStock + quantity);
                if (currentStock + quantity > 10) {
                    return 'Not enough space in the destination section';
                }
                return null;
            }).catch(function(xhr, status, error) {
                console.error('Error fetching destination stock:', xhr.responseText);
                var currentStock = 0;
                if (currentStock + quantity > 10) {
                    return 'Not enough space in the destination section';
                }
                return null;
            });
            validationPromises.push(destinationPromise);
        }

        if (validationPromises.length === 0) {
            callback(null);
            return;
        }

        $.when.apply($, validationPromises).then(function() {
            var errors = Array.prototype.slice.call(arguments);
            for (var i = 0; i < errors.length; i++) {
                if (errors[i]) {
                    callback(errors[i]);
                    return;
                }
            }
            callback(null);
        });
    }

    window.saveStockEntry = function() {
        $('.alert').remove();
        
        var validationError = validateForm();
        if (validationError) {
            showNotification(validationError, 'error');
            return;
        }

        validateStock(function(stockError) {
            if (stockError) {
                showNotification(stockError, 'error');
                return;
            }

            var formData = collectFormData();
            
            var saveButton = $('button[onclick="saveStockEntry()"]');
            var originalText = saveButton.text();
            saveButton.text('Saving...').prop('disabled', true);

            $.ajax({
                url: '/api/method/navari_warehouse.www.api.get_token.get_api_token',
                method: 'GET',
                dataType: 'json'
            })
            .done(function(tokenResponse) {
                $.ajax({
                    url: '/api/resource/Stock Entry',
                    method: 'POST',
                    contentType: 'application/json',
                    headers: {
                        'Authorization': 'token ' + tokenResponse.message,
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
            })
            .fail(function(xhr, status, error) {
                console.error('Error fetching API token:', xhr.responseText);
                showNotification('Failed to retrieve API token', 'error');
                saveButton.text(originalText).prop('disabled', false);
            });
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