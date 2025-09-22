const express = require('express');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const { authenticateJWT } = require('../middleware/auth');
const { generateInvoicePDFBuffer } = require('../utils/invoicePDF');
const router = express.Router();

// Generate PDF for invoice
router.get('/:invoiceId/pdf', authenticateJWT, async (req, res) => {
  const invoice = await Invoice.findOne({ invoiceId: req.params.invoiceId }).populate('user');
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice_${invoice.invoiceId}.pdf`);
  const pdfBuffer = await generateInvoicePDFBuffer(invoice);
  res.end(pdfBuffer);
});

module.exports = router;
