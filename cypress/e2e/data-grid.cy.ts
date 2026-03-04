describe('Data Grid E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load and display the data grid with 10,000+ rows', () => {
    cy.get('.ag-theme-alpine').should('be.visible');
    cy.get('.ag-center-cols-container').should('exist');
    
    // Verify that rows are rendered (AG Grid uses virtualization)
    cy.get('.ag-row').should('have.length.greaterThan', 0);
  });

  it('should display custom chips renderer for status column', () => {
    // Wait for grid to load
    cy.get('.ag-theme-alpine').should('be.visible');
    
    // Check if status chips are rendered with correct styling
    cy.get('.ag-row').first().within(() => {
      // Status column is the last one (index 9)
      cy.get('.ag-cell').eq(9).within(() => {
        // Should have a chip with border-radius (styling characteristic)
        cy.get('span[style*="border-radius"]').should('exist');
        // Should contain one of the valid status texts
        cy.get('span').then(($span) => {
          const text = $span.text();
          const validStatuses = ['High Priority', 'Pending', 'Completed', 'Warning', 'Normal'];
          const hasValidStatus = validStatuses.some(status => text.includes(status));
          expect(hasValidStatus).to.be.true;
        });
        // Should have background color (chips have colored backgrounds)
        cy.get('span[style*="background-color"]').should('exist');
      });
    });
  });

  it('should allow editing quantity and trigger recalculation', () => {
    cy.get('.ag-theme-alpine').should('be.visible');
    
    // Edit quantity
    cy.get('.ag-row').first().within(() => {
      cy.get('.ag-cell').eq(3).within(() => {
        cy.get('input').clear().type('50');
      });
    });

    // Wait for recalculation
    cy.wait(200);

    // Verify that calculated columns have updated with correct format and values
    cy.get('.ag-row').first().within(() => {
      // Get both subtotal and total to verify relationship
      cy.get('.ag-cell').eq(7).then(($subtotalCell) => {
        const subtotalText = $subtotalCell.text();
        expect(subtotalText).to.include('$');
        const subtotal = parseFloat(subtotalText.replace('$', '').replace(/,/g, ''));
        expect(subtotal).to.be.a('number');
        expect(subtotal).to.be.greaterThan(0);

        // Verify total column
        cy.get('.ag-cell').eq(8).should(($totalCell) => {
          const totalText = $totalCell.text();
          expect(totalText).to.include('$');
          const total = parseFloat(totalText.replace('$', '').replace(/,/g, ''));
          expect(total).to.be.a('number');
          expect(total).to.be.greaterThan(0);
          // Total should be less than or equal to subtotal (after discount)
          expect(total).to.be.at.most(subtotal);
        });
      });
    });
  });

  it('should allow editing unit price and update dependent calculations', () => {
    cy.get('.ag-theme-alpine').should('be.visible');
    
    // Edit unit price
    cy.get('.ag-row').first().within(() => {
      cy.get('.ag-cell').eq(4).within(() => {
        cy.get('input').clear().type('100');
      });
    });

    cy.wait(200);

    // Verify calculations updated with correct format and values
    cy.get('.ag-row').first().within(() => {
      // Subtotal column should contain $ and a valid number
      cy.get('.ag-cell').eq(7).should(($cell) => {
        const text = $cell.text();
        expect(text).to.include('$');
        const subtotal = parseFloat(text.replace('$', '').replace(/,/g, ''));
        expect(subtotal).to.be.a('number');
        expect(subtotal).to.be.greaterThan(0);
      });

      // Total column should contain $ and a valid number
      cy.get('.ag-cell').eq(8).should(($cell) => {
        const text = $cell.text();
        expect(text).to.include('$');
        const total = parseFloat(text.replace('$', '').replace(/,/g, ''));
        expect(total).to.be.a('number');
        expect(total).to.be.greaterThan(0);
      });
    });
  });

  it('should update status chip when total value changes', () => {
    cy.get('.ag-theme-alpine').should('be.visible');
    
    // Get initial status
    let initialStatus: string;
    cy.get('.ag-row').first().within(() => {
      cy.get('.ag-cell').eq(9).within(() => {
        cy.get('span').invoke('text').then((text) => {
          initialStatus = text.trim();
        });
      });
    });

    // Edit values to trigger status change to Warning (total < 50)
    cy.get('.ag-row').first().within(() => {
      // Set a very low value to trigger Warning status
      cy.get('.ag-cell').eq(3).within(() => {
        cy.get('input').clear().type('1');
      });
      cy.get('.ag-cell').eq(4).within(() => {
        cy.get('input').clear().type('10');
      });
    });

    cy.wait(300);

    // Status should reflect the change (Warning for low total < $50)
    cy.get('.ag-row').first().within(() => {
      cy.get('.ag-cell').eq(9).within(() => {
        // Should contain Warning status
        cy.get('span').should('contain.text', 'Warning');
        // Should have Warning styling (orange background)
        cy.get('span[style*="background-color"]').should(($chip) => {
          const bgColor = $chip.css('background-color');
          // Warning has rgb(255, 247, 237) background
          expect(bgColor).to.include('255');
        });
      });
    });
  });

  it('should handle scrolling with large dataset', () => {
    cy.get('.ag-theme-alpine').should('be.visible');
    
    // Scroll down
    cy.get('.ag-body-viewport').scrollTo('bottom', { duration: 1000 });
    cy.wait(500);
    
    // Verify rows are still visible
    cy.get('.ag-row').should('have.length.greaterThan', 0);
    
    // Scroll back up
    cy.get('.ag-body-viewport').scrollTo('top', { duration: 1000 });
    cy.wait(500);
    
    // Verify first rows are visible
    cy.get('.ag-row').first().should('be.visible');
  });

  it('should support sorting', () => {
    cy.get('.ag-theme-alpine').should('be.visible');
    
    // Click on a sortable column header (e.g., Product Name)
    cy.get('.ag-header-cell').contains('Product Name').click();
    
    // Verify sorting indicator appears
    cy.get('.ag-header-cell').contains('Product Name').should('have.class', 'ag-sort-ascending');
  });

  it('should display calculation renderer for numeric columns', () => {
    cy.get('.ag-theme-alpine').should('be.visible');
    
    // Check that calculated columns (Subtotal, Total) are displayed
    cy.get('.ag-header-cell').contains('Subtotal').should('exist');
    cy.get('.ag-header-cell').contains('Total').should('exist');
    
    // Verify cells contain formatted numbers
    cy.get('.ag-row').first().within(() => {
      cy.get('.ag-cell').should('contain.text', '$');
    });
  });

  it('should edit value and see dependent values + chips update together', () => {
    cy.get('.ag-theme-alpine').should('be.visible');
    
    // Get initial values
    let initialSubtotal: number;
    let initialTotal: number;
    let initialStatus: string;
    
    cy.get('.ag-row').first().within(() => {
      // Get initial subtotal
      cy.get('.ag-cell').eq(7).invoke('text').then((text) => {
        initialSubtotal = parseFloat(text.replace('$', '').replace(/,/g, ''));
      });
      
      // Get initial total
      cy.get('.ag-cell').eq(8).invoke('text').then((text) => {
        initialTotal = parseFloat(text.replace('$', '').replace(/,/g, ''));
      });
      
      // Get initial status
      cy.get('.ag-cell').eq(9).within(() => {
        cy.get('span').invoke('text').then((text) => {
          initialStatus = text.trim();
        });
      });
    });

    // Edit quantity to trigger recalculation
    cy.get('.ag-row').first().within(() => {
      cy.get('.ag-cell').eq(3).within(() => {
        cy.get('input').clear().type('100');
      });
    });

    cy.wait(300);

    // Verify ALL dependent values updated: subtotal, total, AND status chip
    cy.get('.ag-row').first().within(() => {
      // 1. Verify Subtotal updated
      cy.get('.ag-cell').eq(7).should(($cell) => {
        const newSubtotal = parseFloat($cell.text().replace('$', '').replace(/,/g, ''));
        expect(newSubtotal).to.be.a('number');
        expect(newSubtotal).to.be.greaterThan(0);
        // Subtotal should be different from initial (unless quantity was already 100)
        expect(newSubtotal).to.not.equal(initialSubtotal);
      });

      // 2. Verify Total updated
      cy.get('.ag-cell').eq(8).should(($cell) => {
        const newTotal = parseFloat($cell.text().replace('$', '').replace(/,/g, ''));
        expect(newTotal).to.be.a('number');
        expect(newTotal).to.be.greaterThan(0);
        expect(newTotal).to.not.equal(initialTotal);
      });

      // 3. Verify Status chip updated (if total changed significantly)
      cy.get('.ag-cell').eq(9).within(() => {
        cy.get('span').should(($chip) => {
          const newStatus = $chip.text().trim();
          // Status should be a valid status
          const validStatuses = ['High Priority', 'Pending', 'Completed', 'Warning', 'Normal'];
          expect(validStatuses).to.include(newStatus);
          // Status chip should have styling
          expect($chip.css('background-color')).to.exist;
        });
      });
    });
  });

  it('should handle scrolling and editing combined with large dataset', () => {
    cy.get('.ag-theme-alpine').should('be.visible');
    
    // Scroll to middle of dataset
    cy.get('.ag-body-viewport').scrollTo(0, 5000, { duration: 1000 });
    cy.wait(500);
    
    // Verify we're in the middle of the dataset
    cy.get('.ag-row').should('have.length.greaterThan', 0);
    
    // Find a row in the middle and edit it
    cy.get('.ag-row').eq(5).within(() => {
      // Get initial values
      let initialSubtotal: number;
      cy.get('.ag-cell').eq(7).invoke('text').then((text) => {
        initialSubtotal = parseFloat(text.replace('$', '').replace(/,/g, ''));
      });

      // Edit quantity
      cy.get('.ag-cell').eq(3).within(() => {
        cy.get('input').clear().type('75');
      });

      cy.wait(300);

      // Verify calculations updated after scrolling
      cy.get('.ag-cell').eq(7).should(($cell) => {
        const newSubtotal = parseFloat($cell.text().replace('$', '').replace(/,/g, ''));
        expect(newSubtotal).to.be.a('number');
        expect(newSubtotal).to.be.greaterThan(0);
      });

      // Verify total updated
      cy.get('.ag-cell').eq(8).should(($cell) => {
        const total = parseFloat($cell.text().replace('$', '').replace(/,/g, ''));
        expect(total).to.be.a('number');
        expect(total).to.be.greaterThan(0);
      });

      // Verify status chip is visible and updated
      cy.get('.ag-cell').eq(9).within(() => {
        cy.get('span').should('be.visible');
        cy.get('span[style*="background-color"]').should('exist');
      });
    });

    // Scroll to bottom
    cy.get('.ag-body-viewport').scrollTo('bottom', { duration: 1000 });
    cy.wait(500);
    
    // Edit a row at the bottom
    cy.get('.ag-row').last().within(() => {
      cy.get('.ag-cell').eq(4).within(() => {
        cy.get('input').clear().type('200');
      });

      cy.wait(300);

      // Verify calculations work at bottom of dataset
      cy.get('.ag-cell').eq(8).should(($cell) => {
        const total = parseFloat($cell.text().replace('$', '').replace(/,/g, ''));
        expect(total).to.be.a('number');
        expect(total).to.be.greaterThan(0);
      });
    });

    // Scroll back to top
    cy.get('.ag-body-viewport').scrollTo('top', { duration: 1000 });
    cy.wait(500);
    
    // Verify first row is still editable and calculations work
    cy.get('.ag-row').first().within(() => {
      cy.get('.ag-cell').eq(3).within(() => {
        cy.get('input').should('exist');
      });
    });
  });
});

