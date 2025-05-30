$(document).ready(function() {
    loadStockLedgerEntries();
    
    setupEventHandlers();
    
    setDefaultDateRange();
});

function setupEventHandlers() {
    $('#applyFilters').on('click', function() {
        loadStockLedgerEntries();
    });

    $('#downloadPDF').on('click', function() {
        generateFormattedPDF();
    });
    
    $('#clearFilters').on('click', function() {
        clearAllFilters();
    });
    
    $('#productSearch').on('keypress', function(e) {
        if (e.which === 13) { // Enter key
            loadStockLedgerEntries();
        }
    });

}

function setDefaultDateRange() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    $('#toDate').val(formatDateForInput(today));
    $('#fromDate').val(formatDateForInput(thirtyDaysAgo));
}

function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

function getFilterParams() {
    const filters = {};
    
    const productSearch = $('#productSearch').val().trim();
    if (productSearch) {
        filters.product = productSearch;
    }
    
    const fromDate = $('#fromDate').val();
    const toDate = $('#toDate').val();
    
    if (fromDate) {
        filters.fromDate = fromDate + ' 00:00:00';
    }
    
    if (toDate) {
        filters.toDate = toDate + ' 23:59:59';
    }
    
    return filters;
}

function buildApiFilters(filterParams) {
    const apiFilters = [];
    
    if (filterParams.product) {
        apiFilters.push(['product', 'like', `%${filterParams.product}%`]);
    }
    
    if (filterParams.fromDate) {
        apiFilters.push(['date', '>=', filterParams.fromDate]);
    }
    
    if (filterParams.toDate) {
        apiFilters.push(['date', '<=', filterParams.toDate]);
    }
    
    return apiFilters;
}



function clearAllFilters() {
    $('#productSearch').val('');
    $('#fromDate').val('');
    $('#toDate').val('');
    loadStockLedgerEntries();
}

function loadStockLedgerEntries() {
    $('#loadingIndicator').show();
    $('#errorMessage').hide();
    $('#tableContainer').hide();
    $('#noDataMessage').hide();
    
    
    const filterParams = getFilterParams();
    const apiFilters = buildApiFilters(filterParams);
    
    const requestData = {
        fields: '["name", "product", "transaction_type", "from_section", "to_section", "date", "quantity_in", "rate", "creation"]',
        order_by: 'date desc, creation desc'
    };
    
    if (apiFilters.length > 0) {
        requestData.filters = JSON.stringify(apiFilters);
    }
    
    $.ajax({
        url: '/api/resource/Stock Ledger Entry',
        type: 'GET',
        data: requestData,
        headers: {
            'Accept': 'application/json'
        },
        success: function(response) {
            $('#loadingIndicator').hide();
            
            if (response && response.data && response.data.length > 0) {
                updateResultsSummary(response.data.length, filterParams);
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

function updateResultsSummary(count, filterParams) {
    let summaryText = `Showing ${count} entries`;
    
    const filterDescriptions = [];
    
    if (filterParams.product) {
        filterDescriptions.push(`for product "${filterParams.product}"`);
    }
    
    if (filterParams.fromDate && filterParams.toDate) {
        const fromDate = new Date(filterParams.fromDate).toLocaleDateString();
        const toDate = new Date(filterParams.toDate).toLocaleDateString();
        filterDescriptions.push(`from ${fromDate} to ${toDate}`);
    } else if (filterParams.fromDate) {
        const fromDate = new Date(filterParams.fromDate).toLocaleDateString();
        filterDescriptions.push(`from ${fromDate}`);
    } else if (filterParams.toDate) {
        const toDate = new Date(filterParams.toDate).toLocaleDateString();
        filterDescriptions.push(`up to ${toDate}`);
    }
    
    if (filterDescriptions.length > 0) {
        summaryText += ' ' + filterDescriptions.join(' ');
    }
    
    $('#resultsCount').text(summaryText);
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

function generateFormattedPDF() {
    $('#downloadPDF').prop('disabled', true).text('Generating PDF...');
    
    const originalTable = document.getElementById('ledgerTable');
    const tableClone = originalTable.cloneNode(true);
    
    const tempContainer = document.createElement('div');
    tempContainer.style.padding = '20px';
    tempContainer.style.backgroundColor = 'white';
    tempContainer.style.fontFamily = 'Arial, sans-serif';
    tempContainer.style.width = '900px'; 

    const title1 = document.createElement('h2');
    title1.textContent = 'X Electronics Warehouse';
    title1.style.marginBottom = '10px';
    title1.style.textAlign = 'center';
    title1.style.color = '#333';
    title1.style.fontWeight = 'bold';

    const title2 = document.createElement('h3');
    title2.textContent = 'Stock Ledger Report';
    title2.style.marginBottom = '20px';
    title2.style.textAlign = 'center';
    title2.style.color = '#333';
    title2.style.fontWeight = '600';

    const summary = document.createElement('div');
    summary.innerHTML = document.getElementById('resultsCount').textContent;
    summary.style.marginBottom = '15px';
    summary.style.fontSize = '14px';
    summary.style.fontWeight = 'bold';
    
    const dateInfo = document.createElement('div');
    dateInfo.textContent = `Generated on: ${new Date().toLocaleString()}`;
    dateInfo.style.fontSize = '12px';
    dateInfo.style.color = '#666';
    dateInfo.style.marginBottom = '20px';
    
    tableClone.style.width = '100%';
    tableClone.style.fontSize = '11px';
    tableClone.style.borderCollapse = 'collapse';
    
    tempContainer.appendChild(title1);
    tempContainer.appendChild(title2);
    tempContainer.appendChild(dateInfo);
    tempContainer.appendChild(summary);
    tempContainer.appendChild(tableClone);
    
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    document.body.appendChild(tempContainer);
    
    html2canvas(tempContainer, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: tempContainer.scrollWidth,
        height: tempContainer.scrollHeight
    }).then(canvas => {
        document.body.removeChild(tempContainer);
        
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        
        const imgWidth = 297; 
        const pageHeight = 210; 
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        const fileName = `stock-ledger-report-${new Date().toISOString().split('T')[0]}.pdf`;
        const pdfBlob = pdf.output('blob');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(pdfBlob);
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        $('#downloadPDF').prop('disabled', false).text('Download PDF');
        
    }).catch(error => {
        if (document.body.contains(tempContainer)) {
            document.body.removeChild(tempContainer);
        }
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
        $('#downloadPDF').prop('disabled', false).text('Download PDF');
    });
}