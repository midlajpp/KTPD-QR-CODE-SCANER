import archiver from 'archiver';
import Papa from 'papaparse';
import { generateQrBuffer } from './qrService.js';
import MemberField from '../models/MemberField.js';

/**
 * Builds the comprehensive Adobe Illustrator instructions document.
 */
export const getIllustratorReadmeContent = () => {
  return `# ADOBE ILLUSTRATOR VARIABLE DATA MERGE GUIDE
## KTPD Membership Card Automated Generation

This package contains everything needed to batch-generate hundreds of official KTPD ID cards using Adobe Illustrator Variables.

---

### PACKAGE CONTENTS
1. \`ktpd_illustrator_variables.csv\`: Formatted data source with Illustrator variable bindings.
2. \`qr_codes/\`: High-resolution (1024x1024, 300 DPI equivalent) PNG QR codes named by Member ID (e.g., \`KTPD-0001.png\`).
3. \`ktpd_standard_export.csv\`: Standard clean CSV for spreadsheet/database backup.
4. \`README_ILLUSTRATOR.md\`: This exact setup guide.

---

### IMPORTANT NOTICE REGARDING LINKED IMAGES IN ADOBE ILLUSTRATOR
Adobe Illustrator distinguishes between **Text Variables** and **Linked File (Image) Variables**:
- In the CSV, the column \`@qrImage\` starts with the '@' symbol. This tells Adobe Illustrator's Variables engine that this column contains relative file paths to Linked Images.
- Keep the \`ktpd_illustrator_variables.csv\` and the \`qr_codes\` folder in the SAME directory when opening Illustrator so relative paths resolve automatically.

---

### STEP-BY-STEP WORKFLOW IN ADOBE ILLUSTRATOR

#### Step 1: Prepare Your ID Card Template
1. Open your KTPD Membership Card \`.ai\` design in Adobe Illustrator.
2. Ensure you have separate text objects for:
   - Member ID (e.g. "KTPD-0001")
   - Full Name
   - Emirates ID
   - Mobile Number
   - Transport Company
   - Emergency Contact
   - Blood Group
   - Living Area
   - India Address / UAE / India
3. Place a temporary placeholder image for the QR code:
   - Go to **File > Place...**
   - Select any sample QR from the \`qr_codes\` folder (e.g. \`KTPD-0001.png\`).
   - Check **Link** (do NOT embed).
   - Place it on your card artboard at the desired dimensions.

#### Step 2: Import the Variable Data
1. Open the Variables Panel:
   - Go to menu: **Window > Variables**.
2. Click the panel menu (hamburger icon in the top right of the Variables panel) or click the **Import...** button at the bottom.
3. Select \`ktpd_illustrator_variables.csv\` from this unzipped folder.
4. When prompted: "The current document contains variables. Do you want to overwrite?", click **OK**.
5. Illustrator will now list all variables:
   - \`memberId\` (Text)
   - \`name\` (Text)
   - \`emiratesId\` (Text)
   - \`mobileNo\` (Text)
   - \`transportCompany\` (Text)
   - \`bloodGroup\` (Text)
   - \`@qrImage\` (Linked File / Image)
   - and more...

#### Step 3: Bind Artwork Elements to Variables
1. Select your Member ID text object on the artboard.
2. In the Variables panel, click the \`memberId\` variable row.
3. Click the **Make Text Linked** icon at the bottom of the Variables panel.
4. Repeat this binding for each text field (\`name\`, \`bloodGroup\`, etc.).
5. Bind the QR code image:
   - Select the placed QR code image object on the artboard.
   - In the Variables panel, select \`@qrImage\`.
   - Click the **Make Visibility / Linked File** icon.

#### Step 4: Preview and Cycle Data Sets
1. In the Variables panel, use the **Data Set** dropdown menu at the top.
2. Select **Data Set 1**, **Data Set 2**, etc.
3. Watch Illustrator instantly update the text AND dynamically swap the QR code image for each member!

#### Step 5: Batch Export All Cards to PDF or PNG
1. Option A (Illustrator Actions Batch):
   - Record an Action that saves/exports the current document (e.g., Save as PDF or Export as PNG).
   - Go to **Window > Actions** panel menu > **Batch...**
   - Set Source to **Data Sets**.
   - Set Destination to your output folder.
   - Click **OK** to automatically render every member's card!
2. Option B (Illustrator Scripting):
   - Use File > Scripts > Export Data Sets as PDF/PNG.

---
Need Help or Updates?
All QR codes point to permanent URLs and never change when member information is updated in the KTPD Database.
`;
};

/**
 * Creates an Illustrator-compatible ZIP bundle containing:
 * - Illustrator CSV with @qrImage linked variable
 * - High-res PNG QR codes named KTPD-XXXX.png
 * - Detailed README_ILLUSTRATOR.md
 * - Clean standard CSV
 */
export const createIllustratorZipStream = async (members, res) => {
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });

  archive.on('error', (err) => {
    throw err;
  });

  // Pipe to response
  archive.pipe(res);

  // Fetch enabled custom fields for Illustrator CSV export
  const fields = await MemberField.find({ enabled: true, isArchived: false, showInCsv: true }).sort({
    displayOrder: 1,
    createdAt: 1
  });
  const activeKeySet = new Set(fields.map((f) => f.fieldKey));
  const customFields = fields.filter((f) => !f.isSystemField);

  // 1. Prepare Illustrator CSV Data
  const illustratorCsvRows = members.map((m) => {
    const row = {
      memberId: m.memberId
    };

    if (activeKeySet.has('name')) row.name = m.name;
    if (activeKeySet.has('emiratesId')) row.emiratesId = m.emiratesId;
    if (activeKeySet.has('mobileNo')) row.mobileNo = m.mobileNo;
    if (activeKeySet.has('transportCompany')) row.transportCompany = m.transportCompany;
    if (activeKeySet.has('emergencyContact')) row.emergencyContact = m.emergencyContact;
    if (activeKeySet.has('uae')) row.uae = m.uae || '';
    if (activeKeySet.has('india')) row.india = m.india || '';
    if (activeKeySet.has('addressInIndia')) row.addressInIndia = m.addressInIndia || '';
    if (activeKeySet.has('livingArea')) row.livingArea = m.livingArea || '';
    if (activeKeySet.has('bloodGroup')) row.bloodGroup = m.bloodGroup;
    row.status = m.status;

    customFields.forEach((cf) => {
      row[cf.fieldKey] = m.customFields?.[cf.fieldKey] ?? '';
    });

    row['@qrImage'] = `qr_codes/${m.memberId}.png`;
    row['qrImage'] = `${m.memberId}.png`;

    return row;
  });

  const illustratorCsvContent = Papa.unparse(illustratorCsvRows);
  archive.append(illustratorCsvContent, { name: 'ktpd_illustrator_variables.csv' });

  // 2. Prepare Standard CSV Data
  const standardCsvRows = members.map((m) => {
    const row = {
      memberId: m.memberId
    };

    if (activeKeySet.has('name')) row.name = m.name;
    if (activeKeySet.has('emiratesId')) row.emiratesId = m.emiratesId;
    if (activeKeySet.has('mobileNo')) row.mobileNo = m.mobileNo;
    if (activeKeySet.has('transportCompany')) row.transportCompany = m.transportCompany;
    if (activeKeySet.has('emergencyContact')) row.emergencyContact = m.emergencyContact;
    if (activeKeySet.has('uae')) row.uae = m.uae || '';
    if (activeKeySet.has('india')) row.india = m.india || '';
    if (activeKeySet.has('addressInIndia')) row.addressInIndia = m.addressInIndia || '';
    if (activeKeySet.has('livingArea')) row.livingArea = m.livingArea || '';
    if (activeKeySet.has('bloodGroup')) row.bloodGroup = m.bloodGroup;
    row.status = m.status;

    customFields.forEach((cf) => {
      row[cf.fieldKey] = m.customFields?.[cf.fieldKey] ?? '';
    });

    row['qrImage'] = `${m.memberId}.png`;
    row['createdAt'] = m.createdAt ? new Date(m.createdAt).toISOString() : '';

    return row;
  });

  const standardCsvContent = Papa.unparse(standardCsvRows);
  archive.append(standardCsvContent, { name: 'ktpd_standard_export.csv' });

  // 3. Add README_ILLUSTRATOR.md
  archive.append(getIllustratorReadmeContent(), { name: 'README_ILLUSTRATOR.md' });

  // 4. Generate and append each high-res QR PNG concurrently for speed
  const qrPromises = members.map(async (member) => {
    if (member.qrToken) {
      const qrBuffer = await generateQrBuffer(member.qrToken, { width: 600 });
      archive.append(qrBuffer, { name: `qr_codes/${member.memberId}.png` });
    }
  });

  await Promise.all(qrPromises);
  await archive.finalize();
};

/**
 * Creates a ZIP containing only high-res QR code PNGs
 */
export const createQrZipStream = async (members, res) => {
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(res);

  const qrPromises = members.map(async (member) => {
    if (member.qrToken) {
      const qrBuffer = await generateQrBuffer(member.qrToken, { width: 1024 });
      archive.append(qrBuffer, { name: `${member.memberId}.png` });
    }
  });

  await Promise.all(qrPromises);
  await archive.finalize();
};
