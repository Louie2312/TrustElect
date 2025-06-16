const express = require('express');
const router = express.Router();
const { upload } = require('../middlewares/partylistUploadMiddleware');
const partylistController = require('../controllers/partylistController');
const { verifyToken, isSuperAdmin } = require('../middlewares/authMiddleware');

router.post('/',
  verifyToken, isSuperAdmin,
  upload.single('logo'),
  partylistController.createPartylist
);

router.get('/',
  verifyToken, isSuperAdmin,
  partylistController.getAllPartylists
);


router.get('/archived',
  verifyToken, isSuperAdmin,
  partylistController.getArchivedPartylists
);


router.get('/:id',
  verifyToken, isSuperAdmin,
  partylistController.getPartylistById
);

router.put('/:id',
  verifyToken, isSuperAdmin,
  upload.single('logo'),
  partylistController.updatePartylist
);


router.delete('/:id',
  verifyToken, isSuperAdmin,
  partylistController.archivePartylist
);

router.post('/:id/restore',
  verifyToken, isSuperAdmin,
  partylistController.restorePartylist
);

router.delete('/:id/permanent',
  verifyToken, isSuperAdmin,
  partylistController.permanentDeletePartylist
);

router.post('/:partylistId/candidates',
  verifyToken, isSuperAdmin,
  partylistController.addPartylistCandidate
);

router.delete('/:partylistId/candidates/:studentId',
  verifyToken, isSuperAdmin,
  partylistController.removePartylistCandidate
);

module.exports = router; 