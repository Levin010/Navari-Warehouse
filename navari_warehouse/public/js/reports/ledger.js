$(document).ready(function() {
    loadStockLedgerEntries();
});

function loadStockLedgerEntries() {
    $('#loadingIndicator').show();
    $('#errorMessage').hide();
    $('#tableContainer').hide();
    $('#noDataMessage').hide();

    $.ajax({
        url: '/api/resource/Stock Ledger Entry',
        type: 'GET',
        data: {
            fields: '["name", "product", "transaction_type", "from_section", "to_section", "date", "quantity_in", "rate", "creation"]',
            order_by: 'date desc, creation desc'
        },
        headers: {
            'Accept': 'application/json'
        },
        success: function(response) {
            $('#loadingIndicator').hide();
            
            if (response && response.data && response.data.length > 0) {
                populateTableWithMovingAverage(response.data);
                $('#tableContainer').show();
            } else {
                $('#noDataMessage').show();
            }
        },
        error: function(xhr, status, error) {
            console.error('Error loading stock ledger entries:', error);
            $('#loadingIndicator').hide();
            $('#errorMessage').show();
        }
    });
}

function populateTableWithMovingAverage(data) {
    const tbody = $('#ledgerTableBody');
    tbody.empty();
    
    tbody.append('<tr><td colspan="9" style="text-align: center; padding: 20px; color: #666;">Calculating moving average valuations and balance quantities...</td></tr>');
    
    processEntriesSequentially(data, 0);
}

function processEntriesSequentially(data, index) {
    if (index >= data.length) {
        return; 
    }
    
    const entry = data[index];
    const tbody = $('#ledgerTableBody');
    
    Promise.all([
        calculateMovingAverage(entry.product, entry.name),
        getProductBalanceQuantity(entry.product, entry.date)
    ])
    .then(function([movingAvgData, balanceData]) {
        if (index === 0) {
            tbody.empty(); 
        }
        
        const balanceClass = balanceData.balance_quantity <= 5 ? 'balance-quantity low-stock' : 'balance-quantity';
        
        const row = `
            <tr data-index="${index}">
                <td>${formatDate(entry.date)}</td>
                <td>${entry.product || '-'}</td>
                <td>${entry.transaction_type || '-'}</td>
                <td>${entry.from_section || '-'}</td>
                <td>${entry.to_section || '-'}</td>
                <td style="text-align: right;">${formatNumber(entry.quantity_in)}</td>
                <td style="text-align: right;" class="${balanceClass}">${formatNumber(balanceData.balance_quantity)}</td>
                <td style="text-align: right;">${formatCurrency(entry.rate)}</td>
                <td style="text-align: right;">${formatCurrency(movingAvgData.moving_average_rate)}</td>
            </tr>
        `;
        tbody.append(row);
        
        processEntriesSequentially(data, index + 1);
    })
    .catch(function(error) {
        console.error('Error processing entry:', entry, error);
        
        if (index === 0) {
            tbody.empty();
        }
        
        const row = `
            <tr data-index="${index}">
                <td>${formatDate(entry.date)}</td>
                <td>${entry.product || '-'}</td>
                <td>${entry.transaction_type || '-'}</td>
                <td>${entry.from_section || '-'}</td>
                <td>${entry.to_section || '-'}</td>
                <td style="text-align: right;">${formatNumber(entry.quantity_in)}</td>
                <td style="text-align: right; color: #dc3545;">Error</td>
                <td style="text-align: right;">${formatCurrency(entry.rate)}</td>
                <td style="text-align: right; color: #dc3545;">Error</td>
            </tr>
        `;
        tbody.append(row);
        
        processEntriesSequentially(data, index + 1);
    });
}

function calculateMovingAverage(product, entry_name) {
    return new Promise(function(resolve, reject) {
        $.ajax({
            url: '/api/method/navari_warehouse.www.api.moving_average.get_moving_average_valuation',
            type: 'GET',
            data: {
                product: product,
                entry_name: entry_name
            },
            headers: {
                'Accept': 'application/json'
            },
            success: function(response) {
                if (response && response.message) {
                    resolve(response.message);
                } else {
                    resolve({
                        moving_average_rate: 0,
                        total_value: 0,
                        total_quantity: 0
                    });
                }
            },
            error: function(xhr, status, error) {
                reject(error);
            }
        });
    });
}

function getProductBalanceQuantity(product, transaction_datetime) {
    return new Promise(function(resolve, reject) {
        $.ajax({
            url: '/api/method/navari_warehouse.www.api.stock_balance.get_product_balance_at_time',
            type: 'GET',
            data: {
                product: product,
                transaction_date: transaction_datetime,
                creation_time: '' 

            },
            headers: {
                'Accept': 'application/json'
            },
            success: function(response) {
                if (response && response.message) {
                    resolve(response.message);
                } else {
                    resolve({
                        balance_quantity: 0
                    });
                }
            },
            error: function(xhr, status, error) {
                console.error('Error getting balance quantity:', error);
                resolve({
                    balance_quantity: 0
                });
            }
        });
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

function refreshLedger() {
    loadStockLedgerEntries();
}