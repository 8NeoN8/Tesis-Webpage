CREATE TABLE `users` (
  `id` int(11) PRIMARY KEY,
  `role` int(1),
  `username` varchar(30),
  `email` varchar(40),
  `password` varchar(50),
  `profilePicPath` varchar(255),
  `createdAt` datetime,
  `updatedAt` datetime
);

CREATE TABLE `settings` (
  `id` int(20) PRIMARY KEY,
  `user_id` int(11),
  `setting` varchar(30),
  `value` varchar(30),
  `createdAt` datetime,
  `updatedAt` datetime
);

CREATE TABLE `socialNetworks` (
  `id` int(20) PRIMARY KEY,
  `user_id` int(11),
  `networkName` varchar(30),
  `networkLink` varchar(255),
  `createdAt` datetime,
  `updatedAt` datetime
);

CREATE TABLE `comics` (
  `id` int(20) PRIMARY KEY,
  `comicUploader_id` int(11),
  `comicName` varchar(255),
  `comicDescription` varchar(255),
  `comicStatus` varchar(15),
  `comicSchedule` varchar(15),
  `comicWriter` varchar(30),
  `comicCoverPath` varchar(255),
  `comicCategories` varchar(255),
  `comicStart` datetime,
  `createdAt` datetime,
  `updatedAt` datetime
);

CREATE TABLE `chapters` (
  `id` int(20) PRIMARY KEY,
  `comic_id` int(20),
  `chapterNumber` int(4),
  `chaterTitle` varchar(255),
  `createdAt` datetime,
  `updatedAt` datetime
);

CREATE TABLE `comments` (
  `id` int(20) PRIMARY KEY,
  `user_id` int(11),
  `comic_id` int(20),
  `chapter_id` int(20),
  `commentText` varchar(400),
  `createdAt` datetime,
  `updatedAt` datetime
);

CREATE TABLE `likes` (
  `id` int(20),
  `user_id` int(11),
  `comic_id` int(11),
  `createdAt` datetime,
  `updatedAt` datetime
);

ALTER TABLE `settings` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `socialNetworks` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `comics` ADD FOREIGN KEY (`comicUploader_id`) REFERENCES `users` (`id`);

ALTER TABLE `chapters` ADD FOREIGN KEY (`comic_id`) REFERENCES `comics` (`id`);

ALTER TABLE `comments` ADD FOREIGN KEY (`chapter_id`) REFERENCES `chapters` (`id`);

ALTER TABLE `comments` ADD FOREIGN KEY (`id`) REFERENCES `users` (`id`);

ALTER TABLE `comments` ADD FOREIGN KEY (`comic_id`) REFERENCES `comics` (`id`);

ALTER TABLE `likes` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `likes` ADD FOREIGN KEY (`comic_id`) REFERENCES `comics` (`id`);
