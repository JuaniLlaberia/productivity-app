import type { NextFunction, Request, Response } from 'express';
import { User } from '../models/User';
import { catchAsyncError } from '../utils/catchAsyncErrors';
import { CustomError } from '../utils/emailTemplates/error';

//Get auth user
export const getMe = (req: Request, res: Response) => {
  res.status(200).json({ status: 'success', data: req.user });
};

//User relevant search based on name or email
export const userSearch = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.query.searchQuery)
    return next(new CustomError('Missing search query', 404));

  const users = await User.aggregate([
    {
      $search: {
        text: {
          query: req.query.searchQuery,
          path: ['email', 'fullName'],
          fuzzy: {},
        },
      },
    },
    {
      $limit: 5,
    },
    {
      $project: {
        email: 1,
        fullName: 1,
      },
    },
  ]);

  res.status(200).json({ status: 'success', data: users });
};

//Update user
export const updateMe = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    //Filter restricted fields
    const fields = { ...req.body };
    Object.keys(fields)
      .filter(key => key !== 'fullName' && key !== 'profileImg')
      .forEach(field => delete fields[field]);

    const updateStatus = await User.updateOne({ _id: req.user._id }, fields, {
      runValidators: true,
    });

    if (updateStatus.acknowledged) {
      return res
        .status(204)
        .json({ status: 'success', message: 'User updated successfully.' });
    } else return next(new CustomError(`Failed to update user.`, 400));
  }
);

//Delete user
export const deleteMe = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const wasDeleted = await User.deleteOne({ _id: req.user._id });

    if (wasDeleted.acknowledged) {
      return res
        .status(200)
        .json({ status: 'success', message: 'User was deleted successfully.' });
    } else return next(new CustomError(`Failed to delete user.`, 400));
  }
);
