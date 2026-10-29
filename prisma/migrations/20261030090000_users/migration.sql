-- Users: everyone signs in with a user ID and password. The first admin,
-- "admin", keeps the current admin password.

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(40) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "role" VARCHAR(10) NOT NULL DEFAULT 'USER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- The first admin, with the current admin password: a hash, an old plain-text
-- value, or empty for the default "admin". The app hashes it at sign-in.
INSERT INTO "User" ("username", "name", "passwordHash", "role")
VALUES ('admin', 'Admin', COALESCE((SELECT "value" FROM "AppConfig" WHERE "key" = 'admin_password'), ''), 'ADMIN');
