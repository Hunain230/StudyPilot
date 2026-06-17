import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard';
import {
  getResources,
  saveResource,
  getResourceDetails,
  updateResource,
  deleteResource,
  getResourcesByGuide,
  suggestResources,
} from '../../controllers/resource.controller';

const router = Router();
router.use(authGuard);

router.get('/', getResources);
router.post('/', saveResource);
router.post('/suggest', suggestResources);
router.get('/guide/:guideId', getResourcesByGuide);
router.get('/:resourceId', getResourceDetails);
router.put('/:resourceId', updateResource);
router.delete('/:resourceId', deleteResource);

export default router;
