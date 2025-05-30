$(document).ready(function() {
    const today = new Date().toISOString().split('T')[0];
    $('#balanceDate').val(today);
    
    loadStockBalanceReport();
    
    $('#downloadBalancePDF').on('click', function() {
        generateBalancePDF();
    });

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
                <td style="text-align: right;" class="warehouse-sections">${warehouseSections}</td>
                <td style="text-align: right;" class="current-rate">${formatCurrency(item.current_rate)}</td>
                <td style="text-align: right;" class="total-value">${formatCurrency(itemValue)}</td>
            </tr>
        `;
        tbody.append(row);
    });
    
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

function generateBalancePDF() {
    $('#downloadBalancePDF').prop('disabled', true).html(`
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6"></path>
        </svg>
        Generating PDF...
    `);
    
    const tableContainer = document.getElementById('tableContainer');
    if (!tableContainer || tableContainer.style.display === 'none') {
        alert('No data to export. Please load the stock balance report first.');
        resetDownloadButton();
        return;
    }
    
    const tempContainer = document.createElement('div');
    tempContainer.style.padding = '20px';
    tempContainer.style.backgroundColor = 'white';
    tempContainer.style.fontFamily = 'Arial, sans-serif';
    tempContainer.style.width = '600px';
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    
    const title1 = document.createElement('h2');
    title1.textContent = 'X Electronics Warehouse';
    title1.style.marginBottom = '10px';
    title1.style.textAlign = 'center';
    title1.style.color = '#333';
    title1.style.fontSize = '24px';
    title1.style.fontWeight = 'bold';

    const title2 = document.createElement('h3');
    title2.textContent = 'Stock Balance Report';
    title2.style.marginBottom = '20px';
    title2.style.textAlign = 'center';
    title2.style.color = '#333';
    title2.style.fontSize = '24px';
    title2.style.fontWeight = '600';
    
    const summaryDiv = document.createElement('div');
    summaryDiv.style.marginBottom = '20px';
    summaryDiv.style.padding = '15px';
    summaryDiv.style.backgroundColor = '#e7f3ff';
    summaryDiv.style.borderRadius = '4px';
    summaryDiv.style.color = '#0c5aa6';
    summaryDiv.style.fontSize = '14px';
    summaryDiv.style.fontWeight = 'bold';
    
    const reportDate = document.getElementById('reportDateDisplay').textContent;
    const totalProducts = document.getElementById('totalProducts').textContent;
    const totalValue = document.getElementById('totalValue').textContent;
    
    summaryDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 20px;">
            <span><strong>Report Date:</strong> ${reportDate}</span>
            <span><strong>Total Products:</strong> ${totalProducts}</span>
            <span><strong>Total Value:</strong> ${totalValue}</span>
        </div>
    `;
    
    const timestamp = document.createElement('div');
    timestamp.textContent = `Generated on: ${new Date().toLocaleString()}`;
    timestamp.style.fontSize = '12px';
    timestamp.style.color = '#666';
    timestamp.style.marginBottom = '20px';
    timestamp.style.textAlign = 'right';
    
    const originalTable = document.getElementById('balanceTable');
    const tableClone = originalTable.cloneNode(true);
    
    tableClone.style.width = '100%';
    tableClone.style.fontSize = '12px';
    tableClone.style.borderCollapse = 'collapse';
    tableClone.style.marginTop = '20px';
    
    const headers = tableClone.querySelectorAll('thead th');
    headers.forEach(header => {
        header.style.backgroundColor = '#007bff';
        header.style.color = 'white';
        header.style.padding = '12px 8px';
        header.style.fontSize = '12px';
        header.style.fontWeight = 'bold';
    });
    
    const cells = tableClone.querySelectorAll('tbody td');
    cells.forEach(cell => {
        cell.style.padding = '10px 8px';
        cell.style.borderBottom = '1px solid #dee2e6';
        cell.style.fontSize = '11px';
    });
    
    tempContainer.appendChild(title1);
    tempContainer.appendChild(title2);
    tempContainer.appendChild(timestamp);
    tempContainer.appendChild(summaryDiv);
    tempContainer.appendChild(tableClone);
    
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
        const pdf = new jsPDF('portrait', 'mm', 'a4'); 
        
        const imgWidth = 190; 
        const pageHeight = 277; 
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 10; 
        
        
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight + 10; 
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        const fileName = `stock-balance-report-${$('#balanceDate').val()}.pdf`;
        const pdfBlob = pdf.output('blob');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(pdfBlob);
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        resetDownloadButton();
        
    }).catch(error => {
        if (document.body.contains(tempContainer)) {
            document.body.removeChild(tempContainer);
        }
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
        resetDownloadButton();
    });
}

function resetDownloadButton() {
    $('#downloadBalancePDF').prop('disabled', false).html(`
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7,10 12,15 17,10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Download PDF
    `);
}