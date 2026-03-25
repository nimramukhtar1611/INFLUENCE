// services/contractService.js - COMPLETE FIXED VERSION WITH ESIGN
const Contract = require('../models/Contract');
const Deal = require('../models/Deal');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ContractService {
  
  // ==================== CREATE CONTRACT FROM DEAL ====================
  async createContractFromDeal(deal) {
    try {
      // Check if contract already exists
      const existingContract = await Contract.findOne({ dealId: deal._id });
      if (existingContract) {
        return existingContract;
      }

      // Generate contract number
      const contractNumber = await this.generateContractNumber();

      // Generate contract content from template
      const content = await this.generateContractContent(deal);

      // Create contract
      const contract = await Contract.create({
        dealId: deal._id,
        contractNumber,
        brandId: deal.brandId,
        creatorId: deal.creatorId,
        campaignId: deal.campaignId,
        content,
        deliverables: deal.deliverables,
        paymentTerms: {
          total: deal.budget,
          platformFee: deal.platformFee || deal.budget * 0.1,
          netAmount: deal.netAmount || deal.budget * 0.9,
          escrowRequired: true
        },
        status: 'draft',
        version: 1,
        createdBy: deal.createdBy,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });

      // Generate PDF
      await this.generateContractPDF(contract._id);

      return contract;
    } catch (error) {
      console.error('Error creating contract:', error);
      throw error;
    }
  }

  // ==================== GENERATE CONTRACT NUMBER ====================
  async generateContractNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    let contractNumber;
    let exists = true;
    
    while (exists) {
      contractNumber = `CT-${year}${month}-${random}`;
      const existing = await Contract.findOne({ contractNumber });
      exists = !!existing;
    }
    
    return contractNumber;
  }

  // ==================== GENERATE CONTRACT CONTENT ====================
  async generateContractContent(deal) {
    // Populate references
    await deal.populate('brandId', 'brandName email address');
    await deal.populate('creatorId', 'displayName handle email');
    await deal.populate('campaignId', 'title description');

    const template = this.getContractTemplate();
    
    // Replace placeholders
    let content = template
      .replace(/\[CONTRACT_NUMBER\]/g, await this.generateContractNumber())
      .replace(/\[DATE\]/g, new Date().toLocaleDateString())
      .replace(/\[BRAND_NAME\]/g, deal.brandId?.brandName || 'Brand')
      .replace(/\[BRAND_EMAIL\]/g, deal.brandId?.email || 'brand@example.com')
      .replace(/\[CREATOR_NAME\]/g, deal.creatorId?.displayName || 'Creator')
      .replace(/\[CREATOR_HANDLE\]/g, deal.creatorId?.handle || 'creator')
      .replace(/\[CREATOR_EMAIL\]/g, deal.creatorId?.email || 'creator@example.com')
      .replace(/\[CAMPAIGN_TITLE\]/g, deal.campaignId?.title || 'Campaign')
      .replace(/\[CAMPAIGN_DESCRIPTION\]/g, deal.campaignId?.description || '')
      .replace(/\[DELIVERABLES\]/g, this.formatDeliverables(deal.deliverables))
      .replace(/\[BUDGET\]/g, deal.budget)
      .replace(/\[PLATFORM_FEE\]/g, deal.platformFee || deal.budget * 0.1)
      .replace(/\[NET_AMOUNT\]/g, deal.netAmount || deal.budget * 0.9)
      .replace(/\[START_DATE\]/g, deal.startDate ? new Date(deal.startDate).toLocaleDateString() : 'TBD')
      .replace(/\[DEADLINE\]/g, deal.deadline ? new Date(deal.deadline).toLocaleDateString() : 'TBD');

    return content;
  }

  // ==================== GET CONTRACT TEMPLATE ====================
  getContractTemplate() {
    return `INFLUENCEX INFLUENCER CONTRACT AGREEMENT

Contract Number: [CONTRACT_NUMBER]
Date: [DATE]

This Influencer Contract Agreement ("Agreement") is entered into between:

BRAND:
Name: [BRAND_NAME]
Email: [BRAND_EMAIL]

and

CREATOR:
Name: [CREATOR_NAME]
Handle: [CREATOR_HANDLE]
Email: [CREATOR_EMAIL]

1. CAMPAIGN DETAILS
Campaign: [CAMPAIGN_TITLE]
Description: [CAMPAIGN_DESCRIPTION]

2. SERVICES AND DELIVERABLES
Creator agrees to provide the following services for the Campaign:

[DELIVERABLES]

3. COMPENSATION
Total Budget: $[BUDGET]
Platform Fee: $[PLATFORM_FEE]
Net Payment to Creator: $[NET_AMOUNT]

4. TIMELINE
Campaign Start: [START_DATE]
Content Submission Deadline: [DEADLINE]

5. CONTENT RIGHTS AND OWNERSHIP
5.1 Brand Rights: Brand shall have the non-exclusive right to use the Content for marketing purposes for a period of 12 months.
5.2 Creator Rights: Creator retains ownership of their original content and may repost with credit to the Brand.
5.3 Exclusivity: Creator agrees not to create similar content for competing brands during the campaign period.

6. PAYMENT TERMS
6.1 Escrow: Payment shall be held in escrow through the InfluenceX platform.
6.2 Release: Funds will be released upon Brand's approval of deliverables.
6.3 Timeline: Payment will be processed within 5 business days of approval.

7. REVISIONS
7.1 Revision Policy: Brand may request up to 2 rounds of reasonable revisions.
7.2 Timeline: Revision requests must be made within 3 business days of submission.

8. CONFIDENTIALITY
Both parties agree to keep campaign details, pricing, and strategies confidential. This obligation extends for 12 months after campaign completion.

9. TERMINATION
9.1 By Either Party: Either party may terminate with 7 days written notice.
9.2 For Cause: Immediate termination for material breach.
9.3 Effect of Termination: Compensation shall be paid for completed work.

10. DISPUTE RESOLUTION
10.1 Platform Mediation: Disputes shall first be mediated through InfluenceX.
10.2 Arbitration: If not resolved, disputes shall be resolved through binding arbitration.

11. GOVERNING LAW
This Agreement shall be governed by the laws of the State of California.

12. ELECTRONIC SIGNATURES
This Agreement may be executed electronically, and electronic signatures shall have the same legal effect as original signatures.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date above.

_________________________          _________________________
Brand Signature                     Creator Signature

[BRAND_NAME]                        [CREATOR_NAME]
Date: _____________                 Date: _____________
`;
  }

  // ==================== FORMAT DELIVERABLES ====================
  formatDeliverables(deliverables) {
    if (!deliverables || deliverables.length === 0) {
      return 'No specific deliverables defined.';
    }

    return deliverables.map((d, index) => {
      return `${index + 1}. ${d.quantity || 1}x ${d.type} on ${d.platform}
         Description: ${d.description || 'No description'}
         Requirements: ${d.requirements || 'No specific requirements'}`;
    }).join('\n\n');
  }

  // ==================== GENERATE CONTRACT PDF ====================
  async generateContractPDF(contractId) {
    try {
      const contract = await Contract.findById(contractId)
        .populate('brandId', 'brandName email address')
        .populate('creatorId', 'displayName handle email')
        .populate('campaignId', 'title description');

      if (!contract) {
        throw new Error('Contract not found');
      }

      // Create PDF document
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        info: {
          Title: `Contract ${contract.contractNumber}`,
          Author: 'InfluenceX',
          Subject: 'Influencer Agreement',
          Keywords: 'influencer, contract, agreement'
        }
      });

      const fileName = `contract-${contract.contractNumber}.pdf`;
      const filePath = path.join(__dirname, '../uploads/contracts', fileName);
      
      // Ensure directory exists
      const dir = path.join(__dirname, '../uploads/contracts');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Pipe PDF to file
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Add header with logo
      doc.fontSize(25)
         .fillColor('#4F46E5')
         .text('INFLUENCEX', { align: 'center' })
         .fontSize(16)
         .fillColor('#374151')
         .text('Influencer Contract Agreement', { align: 'center' })
         .moveDown();

      // Contract details box
      doc.fillColor('#F3F4F6')
         .rect(50, doc.y, 500, 60)
         .fill()
         .fillColor('#000000')
         .fontSize(10);

      doc.fillColor('#374151')
         .text(`Contract #: ${contract.contractNumber}`, 70, doc.y - 50)
         .text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' })
         .moveDown(2);

      // Parties
      doc.fillColor('#4F46E5')
         .fontSize(14)
         .text('PARTIES', { underline: true })
         .fillColor('#374151')
         .fontSize(11)
         .moveDown(0.5);

      doc.text(`Brand: ${contract.brandId?.brandName || 'Brand'}`)
         .text(`Email: ${contract.brandId?.email || 'N/A'}`)
         .moveDown(0.5)
         .text(`Creator: ${contract.creatorId?.displayName || 'Creator'}`)
         .text(`Handle: ${contract.creatorId?.handle || 'N/A'}`)
         .text(`Email: ${contract.creatorId?.email || 'N/A'}`)
         .moveDown(1);

      // Campaign
      doc.fillColor('#4F46E5')
         .fontSize(14)
         .text('CAMPAIGN DETAILS', { underline: true })
         .fillColor('#374151')
         .fontSize(11)
         .moveDown(0.5);

      doc.text(`Campaign: ${contract.campaignId?.title || 'Campaign'}`)
         .text(`Description: ${contract.campaignId?.description || 'No description'}`)
         .moveDown(1);

      // Deliverables
      doc.fillColor('#4F46E5')
         .fontSize(14)
         .text('DELIVERABLES', { underline: true })
         .fillColor('#374151')
         .fontSize(11)
         .moveDown(0.5);

      contract.deliverables.forEach((del, index) => {
        doc.text(`${index + 1}. ${del.quantity || 1}x ${del.type} on ${del.platform}`);
        if (del.description) {
          doc.text(`   Description: ${del.description}`);
        }
        if (del.requirements) {
          doc.text(`   Requirements: ${del.requirements}`);
        }
        doc.moveDown(0.3);
      });
      doc.moveDown(0.5);

      // Payment Terms
      doc.fillColor('#4F46E5')
         .fontSize(14)
         .text('PAYMENT TERMS', { underline: true })
         .fillColor('#374151')
         .fontSize(11)
         .moveDown(0.5);

      doc.text(`Total Amount: $${contract.paymentTerms?.total || 0}`)
         .text(`Platform Fee: $${contract.paymentTerms?.platformFee || 0}`)
         .text(`Net Amount: $${contract.paymentTerms?.netAmount || 0}`)
         .text(`Payment Method: Escrow (Secure)`)
         .moveDown(1);

      // Terms and Conditions
      doc.fillColor('#4F46E5')
         .fontSize(14)
         .text('TERMS AND CONDITIONS', { underline: true })
         .fillColor('#374151')
         .fontSize(10)
         .moveDown(0.5);

      const terms = contract.content || this.getContractTemplate();
      const lines = terms.split('\n');
      
      for (const line of lines) {
        if (line.trim()) {
          doc.text(line.trim(), { align: 'left' });
        } else {
          doc.moveDown(0.2);
        }
      }
      doc.moveDown(2);

      // Signatures
      doc.fillColor('#4F46E5')
         .fontSize(14)
         .text('SIGNATURES', { underline: true })
         .fillColor('#374151')
         .moveDown(1);

      const signatureY = doc.y;

      // Brand signature line
      doc.lineCap('butt')
         .moveTo(50, signatureY + 20)
         .lineTo(250, signatureY + 20)
         .stroke();

      doc.fontSize(10)
         .text('Brand Signature', 50, signatureY + 25);

      if (contract.signedByBrand) {
        const brandSig = contract.signatures.find(s => s.userType === 'brand');
        if (brandSig) {
          doc.fillColor('#10B981')
             .fontSize(9)
             .text(`✓ Signed on ${new Date(brandSig.signedAt).toLocaleDateString()}`, 50, signatureY + 35)
             .fillColor('#374151');
        }
      } else {
        doc.fontSize(9)
           .text('Pending signature', 50, signatureY + 35)
           .fillColor('#9CA3AF');
      }

      // Creator signature line
      doc.lineCap('butt')
         .moveTo(350, signatureY + 20)
         .lineTo(550, signatureY + 20)
         .stroke();

      doc.fontSize(10)
         .text('Creator Signature', 350, signatureY + 25);

      if (contract.signedByCreator) {
        const creatorSig = contract.signatures.find(s => s.userType === 'creator');
        if (creatorSig) {
          doc.fillColor('#10B981')
             .fontSize(9)
             .text(`✓ Signed on ${new Date(creatorSig.signedAt).toLocaleDateString()}`, 350, signatureY + 35)
             .fillColor('#374151');
        }
      } else {
        doc.fontSize(9)
           .text('Pending signature', 350, signatureY + 35)
           .fillColor('#9CA3AF');
      }

      doc.text(contract.brandId?.brandName || 'Brand', 50, signatureY + 45)
         .text(contract.creatorId?.displayName || 'Creator', 350, signatureY + 45);

      // Footer
      const footerY = doc.page.height - 50;
      doc.fontSize(8)
         .fillColor('#6B7280')
         .text(
           `This contract is legally binding. Generated by InfluenceX on ${new Date().toLocaleString()}`,
           50,
           footerY,
           { align: 'center', width: 500 }
         );

      // Finalize PDF
      doc.end();

      // Wait for stream to finish
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      // Update contract with PDF URL
      contract.pdfUrl = `/uploads/contracts/${fileName}`;
      await contract.save();

      return {
        fileName,
        filePath,
        url: contract.pdfUrl
      };
    } catch (error) {
      console.error('Error generating contract PDF:', error);
      throw error;
    }
  }

  // ==================== SIGN CONTRACT ====================
  async signContract(contractId, userId, userType, signatureData) {
    try {
      const contract = await Contract.findById(contractId);
      
      if (!contract) {
        throw new Error('Contract not found');
      }

      // Check if already signed
      const alreadySigned = contract.signatures.some(
        s => s.userId.toString() === userId.toString()
      );

      if (alreadySigned) {
        throw new Error('Contract already signed by this user');
      }

      // Add signature
      contract.signatures.push({
        userId,
        userType,
        signature: signatureData.signature,
        method: signatureData.method || 'draw',
        ipAddress: signatureData.ipAddress,
        userAgent: signatureData.userAgent,
        signedAt: new Date()
      });

      if (userType === 'brand') {
        contract.signedByBrand = true;
      } else {
        contract.signedByCreator = true;
      }

      // If both signed, update status
      if (contract.signedByBrand && contract.signedByCreator) {
        contract.status = 'signed';
        contract.signedAt = new Date();
        
        // Generate final PDF
        await this.generateContractPDF(contract._id);
      } else {
        contract.status = 'partially_signed';
      }

      await contract.save();
      
      return contract;
    } catch (error) {
      console.error('Error signing contract:', error);
      throw error;
    }
  }

  // ==================== GET CONTRACT PDF ====================
  async getContractPDF(contractId) {
    try {
      const contract = await Contract.findById(contractId);
      
      if (!contract) {
        throw new Error('Contract not found');
      }

      // Generate PDF if not exists
      if (!contract.pdfUrl) {
        await this.generateContractPDF(contract._id);
      }

      const fileName = `contract-${contract.contractNumber}.pdf`;
      const filePath = path.join(__dirname, '../uploads/contracts', fileName);

      if (!fs.existsSync(filePath)) {
        await this.generateContractPDF(contract._id);
      }

      return {
        filePath,
        fileName,
        url: contract.pdfUrl
      };
    } catch (error) {
      console.error('Error getting contract PDF:', error);
      throw error;
    }
  }

  // ==================== SEND FOR SIGNATURE ====================
  async sendForSignature(contractId) {
    try {
      const contract = await Contract.findById(contractId)
        .populate('brandId', 'email fullName')
        .populate('creatorId', 'email displayName');

      if (!contract) {
        throw new Error('Contract not found');
      }

      if (contract.status !== 'draft') {
        throw new Error('Contract has already been sent');
      }

      contract.status = 'sent';
      contract.sentAt = new Date();
      await contract.save();

      return contract;
    } catch (error) {
      console.error('Error sending for signature:', error);
      throw error;
    }
  }

  // ==================== AMEND CONTRACT ====================
  async amendContract(contractId, amendments) {
    try {
      const contract = await Contract.findById(contractId);
      
      if (!contract) {
        throw new Error('Contract not found');
      }

      if (contract.status !== 'draft' && contract.status !== 'amendment') {
        throw new Error('Cannot amend contract in current state');
      }

      // Save current version to history
      if (!contract.versionHistory) {
        contract.versionHistory = [];
      }

      contract.versionHistory.push({
        version: contract.version,
        content: contract.content,
        deliverables: contract.deliverables,
        paymentTerms: contract.paymentTerms,
        amendedAt: new Date(),
        amendedBy: amendments.amendedBy
      });

      // Update contract
      contract.version += 1;
      contract.content = amendments.content || contract.content;
      contract.deliverables = amendments.deliverables || contract.deliverables;
      contract.paymentTerms = { ...contract.paymentTerms, ...amendments.paymentTerms };
      contract.status = 'amendment';
      contract.amendedAt = new Date();

      await contract.save();

      return contract;
    } catch (error) {
      console.error('Error amending contract:', error);
      throw error;
    }
  }

  // ==================== GET CONTRACT HISTORY ====================
  async getContractHistory(contractId) {
    try {
      const contract = await Contract.findById(contractId);
      
      if (!contract) {
        throw new Error('Contract not found');
      }

      return {
        currentVersion: contract.version,
        currentStatus: contract.status,
        signedAt: contract.signedAt,
        signatures: contract.signatures,
        versionHistory: contract.versionHistory || []
      };
    } catch (error) {
      console.error('Error getting contract history:', error);
      throw error;
    }
  }

  // ==================== VERIFY SIGNATURE ====================
  verifySignature(contract, signature) {
    // In a real implementation, this would verify cryptographic signatures
    // For now, return true
    return true;
  }
}

module.exports = new ContractService();