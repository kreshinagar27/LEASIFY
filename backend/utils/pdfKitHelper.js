const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateBillPDF = async (bill, tenant, property, payment = null) => {
  return new Promise((resolve, reject) => {
    try {
      const receiptsDir = path.join(__dirname, '../uploads/receipts');
      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
      }

      const fileName = `invoice-${bill.invoiceNumber}.pdf`;
      const filePath = path.join(receiptsDir, fileName);
      
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Header Block
      doc.fillColor('#4F46E5').fontSize(24).text('LEASIFY', 50, 45, { bold: true });
      doc.fillColor('#6B7280').fontSize(10).text('Commercial Rental Management Platform', 50, 75);
      
      doc.fillColor('#1F2937').fontSize(16).text(payment ? 'PAYMENT RECEIPT' : 'RENT INVOICE', 400, 45, { align: 'right' });
      doc.fontSize(10).fillColor('#4B5563').text(`Invoice #: ${bill.invoiceNumber}`, 400, 70, { align: 'right' });
      doc.text(`Date: ${new Date(bill.createdAt).toLocaleDateString()}`, 400, 85, { align: 'right' });
      doc.text(`Due Date: ${new Date(bill.dueDate).toLocaleDateString()}`, 400, 100, { align: 'right' });
      if (payment) {
        doc.text(`Status: PAID`, 400, 115, { align: 'right' });
      } else {
        doc.text(`Status: ${bill.status.toUpperCase()}`, 400, 115, { align: 'right' });
      }

      doc.moveTo(50, 140).lineTo(550, 140).strokeColor('#E5E7EB').stroke();

      // Owner and Tenant Details
      doc.fillColor('#111827').fontSize(12).text('Property & Owner Info', 50, 160, { underline: true });
      doc.fillColor('#4B5563').fontSize(10);
      doc.text(`Property: ${property.name}`);
      doc.text(`Address: ${property.address.houseNumber}, ${property.address.street}, ${property.address.area}`);
      doc.text(`City: ${property.address.city}, ${property.address.pincode}`);
      
      doc.fillColor('#111827').fontSize(12).text('Bill To (Tenant)', 320, 160, { underline: true });
      doc.fillColor('#4B5563').fontSize(10);
      doc.text(`Tenant: ${tenant.name}`, 320, 180);
      doc.text(`Phone: ${tenant.phone}`, 320, 195);
      doc.text(`Email: ${tenant.email}`, 320, 210);

      doc.moveTo(50, 250).lineTo(550, 250).strokeColor('#E5E7EB').stroke();

      // Billing Breakdown Table
      doc.fillColor('#111827').fontSize(12).text('Itemized Charges', 50, 270);
      
      // Table Header
      let y = 300;
      doc.fillColor('#F3F4F6').rect(50, y, 500, 20).fill();
      doc.fillColor('#374151').fontSize(10).text('Charge Details', 60, y + 5);
      doc.text('Amount (INR)', 450, y + 5, { align: 'right' });

      const items = [
        { name: 'Monthly Rent', val: bill.rent },
        { name: 'Electricity Charges', val: bill.electricityCharges },
        { name: 'Water Charges', val: bill.waterCharges },
        { name: 'Maintenance Charges', val: bill.maintenanceCharges },
        { name: 'Parking Charges', val: bill.parkingCharges },
        { name: 'Other Charges', val: bill.otherCharges },
        { name: 'GST', val: bill.gst },
        { name: 'Late Fee', val: bill.lateFee }
      ];

      y += 20;
      items.forEach((item) => {
        if (item.val > 0) {
          y += 5;
          doc.fillColor('#4B5563').fontSize(10).text(item.name, 60, y);
          doc.text(item.val.toLocaleString('en-IN'), 450, y, { align: 'right' });
          y += 15;
          doc.lineWidth(0.5).strokeColor('#F3F4F6').moveTo(50, y).lineTo(550, y).stroke();
        }
      });

      // Total block
      y += 10;
      doc.fillColor('#111827').fontSize(12).text('Total Amount:', 320, y);
      doc.text(`INR ${bill.totalAmount.toLocaleString('en-IN')}`, 450, y, { align: 'right' });

      // If Payment was processed, print transaction details
      if (payment) {
        y += 40;
        const isDemo = payment.isDemo || payment.paymentMethod === 'Demo';
        doc.fillColor(isDemo ? '#4A1917' : '#10B981').rect(50, y, 500, 50).fill();
        doc.fillColor('#FFFFFF').fontSize(10).text(isDemo ? 'DEMO PAYMENT SIMULATION (No real money transferred)' : 'Transaction Successful Details', 60, y + 8, { underline: true });
        doc.text(`Method: ${payment.paymentMethod}${isDemo ? ' (Demo Simulation)' : ''}`, 60, y + 22);
        doc.text(`Transaction ID: ${payment.transactionId}`, 60, y + 34);
        doc.text(`Paid Date: ${new Date(payment.paymentDate).toLocaleString()}`, 300, y + 22);
      }

      // Footer
      doc.fillColor('#9CA3AF').fontSize(8).text('Thank you for using Leasify. This is a computer-generated receipt.', 50, 750, { align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        resolve(`/uploads/receipts/${fileName}`);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateBillPDF
};
