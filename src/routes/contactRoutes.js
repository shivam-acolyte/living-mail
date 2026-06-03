import express from "express";
import {
  addContactsToList,
  createContact,
  createContactList,
  exportContactsCsv,
  getContact,
  getSuppressionList,
  getUnsubscribedSuppressionList,
  importContactsCsv,
  listContactLists,
  listContacts,
  previewSegment,
  updateContact
} from "../controllers/contactController.js";

const router = express.Router();

router.post("/contacts", createContact);
router.get("/contacts", listContacts);
router.get("/contacts/export.csv", exportContactsCsv);
router.post("/contacts/import", importContactsCsv);
router.get("/contacts/suppressions", getSuppressionList);
router.get("/contacts/suppressions/unsubscribed", getUnsubscribedSuppressionList);
router.get("/contacts/:id", getContact);
router.put("/contacts/:id", updateContact);

router.post("/contact-lists", createContactList);
router.get("/contact-lists", listContactLists);
router.post("/contact-lists/:id/contacts", addContactsToList);

router.post("/segments/preview", previewSegment);

export default router;
