const {Sequelize, DataTypes} = require('sequelize');

const sequelize = new Sequelize('tesis2','root','',{
    host: 'localhost',
    dialect: 'mariadb',
    logging: false
})

const models = {

}

models.UserEntry = sequelize.define('user',{
    id:{
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        defaultValue: true
    },
    role:{
        type: DataTypes.INTEGER(1),
        allowNull:false,
        defaultValue: 0
    },
    username:{
        type: DataTypes.STRING(30),
        allowNull: false
    },
    email:{
        type: DataTypes.STRING(40),
        allowNull: false
    },
    password:{
        type: DataTypes.STRING(50),
        allowNull: false
    }
})

models.ComicEntry = sequelize.define('comic',{
    id:{
        type: DataTypes.INTEGER(20),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        defaultValue: true
    },
    comicUploader_id:{
        type: DataTypes.INTEGER(11),
        references:{
            model:models.UserEntry,
            key:'id'
        },
        allowNull: false
    },
    comicName:{
        type: DataTypes.STRING(255),
        allowNull: false
    },
    comicDescription:{
        type: DataTypes.STRING(255),
        allowNull: false
    },
    comicStatus:{
        type: DataTypes.STRING(15),
        allowNull: true,
        defaultValue: 'en-emision'
    },
    comicSchedule:{
        type: DataTypes.STRING(15),
        allowNull: true,
        defaultValue: 'mensual'
    },
    comicWriter:{
        type: DataTypes.STRING(30),
        allowNull: false
    },
    comicCoverPath:{
        type: DataTypes.STRING(255),
        allowNull: false
    },
    comicCategories:{
        type: DataTypes.STRING(255),
        allowNull: false
    },
    comicStart:{
        type: DataTypes.DATEONLY,
        allowNull:false
    },
})

models.CategoriesEntry = sequelize.define('category',{
    id:{
        type: DataTypes.INTEGER(20),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        defaultValue: true
    },
    comic_id:{
        type: DataTypes.INTEGER(11),
        references:{
            model:models.ComicEntry,
            key:'id'
        },
        allowNull: false
    },
    categoriesList:{
        type: DataTypes.STRING(255),
        allowNull: false
    }
})

models.ChapterEntry = sequelize.define('chapter',{
    id:{
        type: DataTypes.INTEGER(20),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        defaultValue: true
    },
    comic_id:{
        type: DataTypes.INTEGER(20),
        references:{
            model:models.ComicEntry,
            key: 'id'
        },
        allowNull: false
    },
    chapterNumber:{
        type: DataTypes.INTEGER(4),
        allowNull: false
    },
    chapterTitle:{
        type: DataTypes.STRING(255),
        allowNull: false
    }
})

models.CommentEntry = sequelize.define('comment',{
    id:{
        type: DataTypes.INTEGER(20),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        defaultValue: true
    },
    comic_id:{
        type: DataTypes.INTEGER(20),
        references:{
            model:models.ChapterEntry,
            key: 'id'
        },
        allowNull: false
    },
    user_id:{
        type: DataTypes.INTEGER(11),
        references:{
            model:models.UserEntry,
            key:'id'
        },
        allowNull: false
    },
    commentText:{
        type: DataTypes.STRING(400),
        allowNull:false
    }
})

models.SocialEntry = async() => {sequelize.define('socilaNetwork',{
    id:{
        type: DataTypes.INTEGER(20),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        defaultValue: true
    },
    user_id:{
        type: DataTypes.INTEGER(11),
        references:{
            model:models.UserEntry,
            key:'id'
        },
        allowNull: false
    },
    networkName:{
        type: DataTypes.STRING(30),
        allowNull:false
    },
    networkLink:{
        type: DataTypes.STRING(255),
        allowNull:false
    }
})}

/*
*Use model.build({}) to create a new instance
And use await modelInstance.save() to save to database

const Instance = await model.create({}) does the shortcut for the both methods above

console.log(Instance.toJSON()); is the way to go for loggin this process

await instance.update({}) > await instance.save() to update still fresh Instance

await instance.destroy() to delete an fresh Instance from the database


*SELECT QUERY
-Find all users
const users = await UserEntry.findAll();
console.log(users.every(user => user instanceof User)); // true
console.log("All users:", JSON.stringify(users, null, 2));

*WHERE CLAUSES
The basics
Post.findAll({
  where: {
    authorId: 2
  }
});
SELECT * FROM post WHERE authorId = 2;

Observe that no operator (from Op) was explicitly passed, so Sequelize assumed an equality comparison by default. The above code is equivalent to:

const { Op } = require("sequelize");
Post.findAll({
  where: {
    authorId: {
      [Op.eq]: 2
    }
  }
});
SELECT * FROM post WHERE authorId = 2;

Multiple checks can be passed:

Post.findAll({
  where: {
    authorId: 12,
    status: 'active'
  }
});
SELECT * FROM post WHERE authorId = 12 AND status = 'active';

*OR CLAUSES
An OR can be easily performed in a similar way:
Since the above was an OR involving the same field, Sequelize allows you to use a slightly different structure which is more readable and generates the same behavior:

const { Op } = require("sequelize");
Post.destroy({
  where: {
    authorId: {
      [Op.or]: [12, 13]
    }
  }
});
DELETE FROM post WHERE authorId = 12 OR authorId = 13;

*Shorthand syntax for Op.in
Passing an array directly to the where option will implicitly use the IN operator:

Post.findAll({
  where: {
    id: [1,2,3] // Same as using `id: { [Op.in]: [1,2,3] }`
  }
});
SELECT ... FROM "posts" AS "post" WHERE "post"."id" IN (1, 2, 3);

*UPDATE

Update queries also accept the where option, just like the read queries shown above.
-Change veryone without a last name to "Doe"
await User.update({ lastName: "Doe" }, {
  where: {
    lastName: null
  }
});

*DELETE

Delete queries also accept the where option, just like the read queries shown above.
-Delete everyone named "Jane"
await User.destroy({
  where: {
    firstName: "Jane"
  }
});

To destroy everything the TRUNCATE SQL can be used:
-Truncate the table
await User.destroy({
  truncate: true
});

*Limits and Pagination
The limit and offset options allow you to work with limiting / pagination:

-Fetch 10 instances/rows
Project.findAll({ limit: 10 });

-Skip 8 instances/rows
Project.findAll({ offset: 8 });

-Skip 5 instances and fetch the 5 after that
Project.findAll({ offset: 5, limit: 5 });

Usually these are used alongside the order option.

*ORDERING
Subtask.findAll({
  order: [
    Will escape title and validate DESC against a list of valid direction parameters
    ['title', 'DESC'],

*/

module.exports = models;