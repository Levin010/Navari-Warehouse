$(document).ready(function () {
  let searchTimeout;
  
  // Initial load
  fetchProducts();
  
  document.getElementById("search").addEventListener("input", function () {
  fetchProducts(this.value);
});
  
  function showLoading(show) {
    const loading = document.getElementById("loading");
    const grid = document.getElementById("product-grid");
    const noResults = document.getElementById("no-results");
    
    loading.style.display = show ? "block" : "none";
    if (show) {
      grid.style.opacity = "0.5";
      noResults.style.display = "none";
    } else {
      grid.style.opacity = "1";
    }
  }
  
  function fetchProducts(search = "") {
    showLoading(true);
    
    $.ajax({
      url: "/api/resource/Product",
      method: "GET",
      data: { 
        filters: search ? JSON.stringify([["product_name", "like", `%${search}%`]]) : "[]",
        fields: JSON.stringify(["name", "product_name", "description", "product_image"])
      },
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      success: function (response) {
        showLoading(false);
        const products = response.data || [];
        const grid = document.getElementById("product-grid");
        const noResults = document.getElementById("no-results");
        
        grid.innerHTML = "";
        
        if (products.length === 0) {
          noResults.style.display = "block";
          return;
        } else {
          noResults.style.display = "none";
        }
        
        products.forEach((product, index) => {
          const card = document.createElement("div");
          card.className = "product-card";
          card.style.cssText = `
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            transition: all 0.3s ease;
            cursor: pointer;
            border: 1px solid #f7fafc;
            animation-delay: ${index * 0.1}s;
          `;
          
          // Add hover effects
          card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
            this.style.boxShadow = '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)';
          });
          
          card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)';
          });
          
          // Product image
          const imageUrl = product.product_image ? 
            (product.product_image.startsWith('/') ? product.product_image : `/files/${product.product_image}`) : 
            '/assets/frappe/images/ui/bubble-tea.svg'; // Fallback image
          
          card.innerHTML = `
            <div style="position: relative; width: 100%; height: 200px; overflow: hidden; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <img 
                src="${imageUrl}" 
                alt="${product.product_name}"
                style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;"
                onload="this.style.background = 'transparent'"
                onerror="this.style.display = 'none'; this.nextElementSibling.style.display = 'flex'"
              />
              <div style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 48px;">
                📦
              </div>
            </div>
            
            <div style="padding: 20px;">
              <h3 style="font-size: 18px; font-weight: 600; color: #2d3748; margin: 0 0 8px 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${product.product_name}
              </h3>
              
              <p style="color: #718096; font-size: 14px; line-height: 1.5; margin: 0 0 16px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 40px;">
                ${product.description || "No description available"}
              </p>
              
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 8px; color: #4299e1; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
                  <div style="width: 6px; height: 6px; background: #4299e1; border-radius: 50%;"></div>
                  Available
                </div>
                
                <a 
                  href="/product/${product.name}" 
                  style="display: inline-flex; align-items: center; gap: 6px; background: #4299e1; color: white; text-decoration: none; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 500; transition: all 0.2s ease;"
                  onmouseover="this.style.background = '#3182ce'; this.style.transform = 'scale(1.05)'"
                  onmouseout="this.style.background = '#4299e1'; this.style.transform = 'scale(1)'"
                >
                  View Details
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </a>
              </div>
            </div>
          `;
          
          // Make entire card clickable
          card.addEventListener('click', function(e) {
            if (e.target.tagName !== 'A') {
              window.location.href = `/product/${product.name}`;
            }
          });
          
          grid.appendChild(card);
        });
      },
      error: function (xhr, status, error) {
        showLoading(false);
        console.error("Error fetching products:", error);
        
        // Show error message
        const grid = document.getElementById("product-grid");
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #e53e3e;">
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Error loading products</h3>
            <p style="font-size: 16px; margin: 0;">Please try again later</p>
          </div>
        `;
      }
    });
  }
});