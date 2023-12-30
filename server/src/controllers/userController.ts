import type { Request, Response } from 'express';
import { User } from '../models/User';

//Get auth user
export const getMe = (req: Request, res: Response) => {
  res.status(200).json({ status: 'success', data: req.user });
};

//User relevant search based on name or email
export const userSearch = (req: Request, res: Response) => {};

//Update user
export const updateMe = async (req: Request, res: Response) => {
  //Filter restricted fields
  const fields = { ...req.body };
  Object.keys(fields)
    .filter(key => key !== 'fullName' && key !== 'profileImg')
    .forEach(field => delete fields[field]);

  const updateStatus = await User.updateOne({ _id: req.user._id }, fields);

  if (updateStatus.acknowledged) {
    return res
      .status(204)
      .json({ status: 'success', message: 'User updated successfully.' });
  } else
    return res
      .status(400)
      .json({ status: 'failed', message: 'Failed to update user.' });
};

//Delete user
export const deleteMe = async (req: Request, res: Response) => {
  const wasDeleted = await User.deleteOne({ _id: req.user._id });

  if (wasDeleted.acknowledged) {
    return res
      .status(200)
      .json({ status: 'success', message: 'User was deleted successfully.' });
  } else
    return res
      .status(400)
      .json({ status: 'failed', message: 'Failed to delete user.' });
};
