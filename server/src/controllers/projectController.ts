import mongoose from 'mongoose';
import { NextFunction, Request, Response } from 'express';
import { Project } from '../models/Project';
import { Email } from '../utils/emails';
import { User } from '../models/User';
import { catchAsyncError } from '../utils/catchAsyncErrors';
import { CustomError } from '../utils/emailTemplates/error';

export const getProjectById = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const project = await Project.findById(req.params.projectId).select('-__v');

    if (!project?.members.includes(req.user._id)) {
      console.log('Error');
      return next(
        new CustomError(
          'You are not part of this project. Information is only for members.',
          401
        )
      );
    }

    res.status(200).json({ status: 'success', data: project });
  }
);

//Get projects where auth user is member
export const getProjects = catchAsyncError(
  async (req: Request, res: Response) => {
    let projectsQuery = Project.find({ members: { $in: [req.user._id] } });

    //Pagination
    if (req.query.page) {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      projectsQuery.skip(skip).limit(limit);
    }

    const projects = await projectsQuery.select('name createdBy');

    res
      .status(200)
      .json({ status: 'success', count: projects.length, data: projects });
  }
);

//Create new project
export const createProject = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.body.name)
      return next(new CustomError('Provide neccesary information.', 400));

    const userData = req.user;
    //Check if user has projects to create or has reached the limit
    if (userData.projectsLeft === 0)
      return next(
        new CustomError('You have reach the max. amount of projects.', 400)
      );

    await Project.create({
      name: req.body.name,
      members: [userData._id],
      admins: [userData._id],
    });

    res
      .status(201)
      .json({ status: 'success', message: 'Project created successfully.' });
  }
);

//Delete project
export const deleteProject = catchAsyncError(
  async (req: Request, res: Response) => {
    const projectToDelete = await Project.deleteOne({
      _id: req.params.projectId,
    });

    if (projectToDelete.acknowledged) {
      return res.status(200).json({ message: 'Project deleted successfully.' });
    } else {
      return res.status(400).json({ message: 'Failed to delete project.' });
    }
  }
);

//Update project info
export const updateProject = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    //Filter body
    const fields = { ...req.body };
    Object.keys(fields)
      .filter(key => key !== 'name' && key !== 'projectImg')
      .forEach(field => delete fields[field]);

    const successUpdate = await Project.updateOne(
      { _id: req.params.projectId },
      fields
    );

    if (successUpdate) {
      return res
        .status(204)
        .json({ status: 'success', message: 'Project updated successfully.' });
    } else return next(new CustomError(`Failed to update project.`, 404));
  }
);

//Remove user from project
export const removeUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const removeOp = await Project.updateOne(
      { _id: req.params.projectId },
      { $pull: { members: req.body.userId, admins: req.body.userId } }
    );

    if (removeOp.acknowledged) {
      return res
        .status(200)
        .json({ status: 'success', message: 'User removed successfully.' });
    } else
      return next(new CustomError(`Failed to remove user from project.`, 400));
  }
);

//Give or Revoke admin permits to user inside of a project
export const toggleAdmin = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId: string = req.body.userId;

    if (!userId)
      return next(
        new CustomError(
          `Provide the neccesary data for this operation (Missing userId).`,
          400
        )
      );

    if (req.projectAdmins.includes(userId)) {
      await Project.updateOne(
        { _id: req.params.projectId },
        { $pull: { admins: userId } }
      );
    } else {
      await Project.updateOne(
        { _id: req.params.projectId },
        { $push: { admins: userId } }
      );
    }

    return res
      .status(204)
      .json({ status: 'success', message: 'Admins updated successfully.' });
  }
);

//Invite user to project
export const inviteUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    //User to invite information

    const {
      fullName,
      userId,
      email,
    }: { fullName: string; userId: string; email: string } = req.body;

    //Check if user exists
    try {
      const isValidUser = await User.exists({ _id: userId });

      if (!isValidUser)
        return next(new CustomError(`Couldn't find user.`, 404));
    } catch (err) {
      return next(new CustomError(`Invalid user Id.`, 404));
    }

    //Add user to invitations whitelist
    await Project.updateOne(
      { _id: req.params.projectId },
      { $addToSet: { invitations: userId } }
    );

    //Send email
    new Email({ email, fullName }).projectInvitation(req.params.projectId, 'X');

    res
      .status(200)
      .json({ status: 'success', message: 'Invitation sent successfully.' });
  }
);

//Join projects with invitation link
export const joinProject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    //Check if user is in the invitation whitelist
    const project = await Project.findOne({ _id: req.params.projectId }).select(
      'invitations members'
    );

    if (project?.members.includes(req.user._id))
      return next(
        new CustomError(`You are already a member of this project.`, 401)
      );

    if (!project?.invitations.includes(req.user._id))
      return next(
        new CustomError(
          `You haven't been invited to this project or the invitation has expired.`,
          404
        )
      );

    //Add userId to members and delete userId from invitations
    await Project.updateOne(
      { _id: req.params.projectId },
      {
        $addToSet: { members: req.user._id },
        $pull: { invitations: req.user._id },
      }
    );

    await session.commitTransaction();
    res.status(200).json({
      status: 'success',
      message: 'You joined the project successfully.',
    });
  } catch (err) {
    await session.abortTransaction();
    next(new CustomError(`Something went wrong.`, 404));
  } finally {
    session.endSession();
  }
};

//Restrict just for admins
export const adminRestriction = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const currentProject = await Project.findOne({
      _id: req.params.projectId,
    }).select('admins');

    if (!currentProject)
      return next(new CustomError(`Project doesn't exist.`, 404));

    if (currentProject.admins && !currentProject.admins.includes(req.user._id))
      return next(
        new CustomError(
          `You don't have enough permissions to do this action.`,
          404
        )
      );

    req.projectAdmins = currentProject.admins;
    next();
  }
);
