import {Router, Request, Response} from "express"

const healthRouter = Router();

healthRouter.get("/", (req: Request, res: Response) => {
  res.json({ status: "A.N.I.T.A. Core is online.", version: "2.4.1" });
});

export default healthRouter;
