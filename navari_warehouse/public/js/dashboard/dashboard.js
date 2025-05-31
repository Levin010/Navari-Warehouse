$(document).ready(function() {
    loadDashboardData();
});

function loadDashboardData() {
    loadDashboardCards();
    loadRecentActivity();
}

function loadDashboardCards() {
    $('#total-inventory-count').text('Loading...');
    $('#total-products-count').text('Loading...');
    $('#products-in-stock-count').text('Loading...');
    $('#products-out-stock-count').text('Loading...');
    $('#total-value-amount').text('Loading...');
    
    Promise.all([
        fetchAllProducts(),
        fetchWarehouseProductStock()
    ]).then(function(results) {
        const products = results[0];
        const warehouseStock = results[1];
        
        calculateAndUpdateCards(products, warehouseStock);
    }).catch(function(error) {
        console.error('Error loading dashboard data:', error);
        $('#total-inventory-count').text('Error');
        $('#total-products-count').text('Error');
        $('#products-in-stock-count').text('Error');
        $('#products-out-stock-count').text('Error');
        $('#total-value-amount').text('Error');
    });
}

function fetchAllProducts() {
    return new Promise(function(resolve, reject) {
        $.ajax({
            url: '/api/resource/Product',
            type: 'GET',
            data: {
                fields: '["name", "rate"]',
                limit_page_length: 0 // Get all products
            },
            headers: {
                'Accept': 'application/json'
            },
            success: function(response) {
                resolve(response.data || []);
            },
            error: function(xhr, status, error) {
                reject(error);
            }
        });
    });
}

function fetchWarehouseProductStock() {
    return new Promise(function(resolve, reject) {
        $.ajax({
            url: '/api/resource/Warehouse Product Stock',
            type: 'GET',
            data: {
                fields: '["warehouse_section", "product", "quantity"]',
                limit_page_length: 0 // Get all stock entries
            },
            headers: {
                'Accept': 'application/json'
            },
            success: function(response) {
                resolve(response.data || []);
            },
            error: function(xhr, status, error) {
                reject(error);
            }
        });
    });
}

function calculateAndUpdateCards(products, warehouseStock) {
    const totalProducts = products.length;

    let totalQuantityInWarehouse = 0;
    warehouseStock.forEach(function(stock) {
        totalQuantityInWarehouse += stock.quantity || 0;
    });
    
    const productStockMap = {};
    warehouseStock.forEach(function(stock) {
        if (productStockMap[stock.product]) {
            productStockMap[stock.product] += stock.quantity || 0;
        } else {
            productStockMap[stock.product] = stock.quantity || 0;
        }
    });
    
    let productsInStock = 0;
    let productsOutOfStock = 0;
    let totalValue = 0;
    
    products.forEach(function(product) {
        const stockQuantity = productStockMap[product.name] || 0;
        const rate = parseFloat(product.rate) || 0;
        
        if (stockQuantity > 0) {
            productsInStock++;
            totalValue += stockQuantity * rate;
        } else {
            productsOutOfStock++;
        }
    });
    
    updateTotalInventoryCountCard(totalQuantityInWarehouse);
    updateTotalProductsCard(totalProducts);
    updateProductsInStockCard(productsInStock);
    updateProductsOutOfStockCard(productsOutOfStock);
    updateTotalValueCard(totalValue);
}

function loadRecentActivity() {
    $('#recentActivityLoading').show();
    $('#recentActivityError').hide();
    $('#recentActivityContainer').hide();
    $('#noRecentActivityMessage').hide();

    $.ajax({
        url: '/api/resource/Stock Ledger Entry',
        type: 'GET',
        data: {
            fields: '["name", "product", "transaction_type", "from_section", "to_section", "date", "quantity_in", "rate", "creation"]',
            order_by: 'date desc, creation desc',
            limit: 5
        },
        headers: {
            'Accept': 'application/json'
        },
        success: function(response) {
            $('#recentActivityLoading').hide();
            
            if (response && response.data && response.data.length > 0) {
                populateRecentActivity(response.data);
                $('#recentActivityContainer').show();
            } else {
                $('#noRecentActivityMessage').show();
            }
        },
        error: function(xhr, status, error) {
            console.error('Error loading recent activities:', error);
            $('#recentActivityLoading').hide();
            $('#recentActivityError').show();
        }
    });
}

function populateRecentActivity(data) {
    const tbody = $('#recentActivityTableBody');
    tbody.empty();
    
    data.forEach(function(entry) {
        const row = `
            <tr>
                <td>${formatDate(entry.date)}</td>
                <td>${entry.product || '-'}</td>
                <td>${entry.transaction_type || '-'}</td>
                <td>${entry.from_section || '-'}</td>
                <td>${entry.to_section || '-'}</td>
                <td style="text-align: right;">${formatNumber(entry.quantity_in)}</td>
                <td style="text-align: right;">${formatCurrency(entry.rate)}</td>
            </tr>
        `;
        tbody.append(row);
    });
}

function formatDate(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
}

function formatNumber(number) {
    if (!number && number !== 0) return '-';
    return parseFloat(number).toLocaleString();
}

function formatCurrency(amount) {
    if (!amount && amount !== 0) return '-';
    return parseFloat(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function refreshDashboard() {
    loadDashboardData();
}

function updateTotalInventoryCountCard(count) {
    $('#total-inventory-count').text(formatNumber(count));
}

function updateTotalProductsCard(count) {
    $('#total-products-count').text(formatNumber(count));
}

function updateProductsInStockCard(count) {
    $('#products-in-stock-count').text(formatNumber(count));
}

function updateProductsOutOfStockCard(count) {
    $('#products-out-stock-count').text(formatNumber(count));
}

function updateTotalValueCard(amount) {
    $('#total-value-amount').text('KES ' + formatCurrency(amount));
}