$(document).ready(function() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    $('#balanceDate').val(today);
    
    // Load initial report
    loadStockBalanceReport();
    
    // Event handlers
    $('#refreshBalance').click(function() {
        loadStockBalanceReport();
    });
    
    $('#balanceDate').change(function() {
        loadStockBalanceReport();
    });
});

function loadStockBalanceReport() {
    const selectedDate = $('#balanceDate').val();
    
    if (!selectedDate) {
        alert('Please select a date for the balance report.');
        return;
    }
    
    $('#loadingIndicator').show();
    $('#errorMessage').hide();
    $('#tableContainer').hide();
    $('#noDataMessage').hide();
    
    // Update report date display
    const formattedDate = formatDateForDisplay(selectedDate);
    $('#reportDateDisplay').text(formattedDate);
    
    $.ajax({
        url: '/api/method/navari_warehouse.www.api.stock_balance.get_consolidated_stock_balance',
        type: 'GET',
        data: {
            balance_date: selectedDate
        },
        headers: {
            'Accept': 'application/json'
        },
        success: function(response) {
            $('#loadingIndicator').hide();
            
            if (response && response.message && response.message.length > 0) {
                populateBalanceTable(response.message);
                $('#tableContainer').show();
            } else {
                $('#noDataMessage').show();
            }
        },
        error: function(xhr, status, error) {
            console.error('Error loading stock balance report:', error);
            $('#loadingIndicator').hide();
            $('#errorMessage').show();
        }
    });
}

function populateBalanceTable(data) {
    const tbody = $('#balanceTableBody');
    tbody.empty();
    
    let totalProducts = 0;
    let totalValue = 0;
    
    data.forEach(function(item) {
        totalProducts++;
        const itemValue = (item.total_quantity || 0) * (item.current_rate || 0);
        totalValue += itemValue;
        
        const quantityClass = (item.total_quantity || 0) > 0 ? 'total-quantity' : 'zero-quantity';
        const warehouseSections = item.warehouse_sections || '-';
        
        const row = `
            <tr>
                <td>${item.product || '-'}</td>
                <td style="text-align: right;" class="${quantityClass}">${formatNumber(item.total_quantity)}</td>
                <td class="warehouse-sections">${warehouseSections}</td>
                <td style="text-align: right;" class="current-rate">${formatCurrency(item.current_rate)}</td>
                <td style="text-align: right;" class="total-value">${formatCurrency(itemValue)}</td>
            </tr>
        `;
        tbody.append(row);
    });
    
    // Update summary
    $('#totalProducts').text(totalProducts);
    $('#totalValue').text(formatCurrency(totalValue));
}

function formatDateForDisplay(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
}

function formatNumber(number) {
    if (!number && number !== 0) return '0';
    return parseFloat(number).toLocaleString();
}

function formatCurrency(amount) {
    if (!amount && amount !== 0) return '0.00';
    return parseFloat(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function refreshBalanceReport() {
    loadStockBalanceReport();
}