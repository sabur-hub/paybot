const { Telegraf } = require('telegraf');
const session = require('telegraf/session');
const fs = require('fs');
const postgres = require('postgres')

const token = '';
const bot = new Telegraf(token);
bot.use(session());

const client = postgres('postgres://ksepissj:M8KoCbUXeX5NRLIJqvJ-WTJssfWVZvVH@mahmud.db.elephantsql.com/ksepissj',{
    host: "mahmud.db.elephantsql.com",
    port: 5432,
    database: "ksepissj",
    user: "ksepissj",
    password: "M8KoCbUXeX5NRLIJqvJ-WTJssfWVZvVH",
})

bot.start(async (ctx) => {
    const chatId = ctx.chat.id;

    await ctx.reply('Привет! Добро пожаловать в нашего бота!');
    await ctx.reply('Пожалуйста, выберите тип подписки:', {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Light', callback_data: 'light' }],
                [{ text: 'Medium', callback_data: 'medium' }],
                [{ text: 'Ultra', callback_data: 'ultra' }]
            ]
        }
    });
});

bot.action(['light', 'medium', 'ultra'], async (ctx) => {
    const chatId = ctx.chat.id;
    let subscriptionType = ctx.callbackQuery.data;

    const imagePath = './images/';
    await ctx.replyWithPhoto({source: fs.readFileSync(`${imagePath}${subscriptionType}.png`)});

    await ctx.reply('Пожалуйста, отправьте скриншот успешной оплаты подписки.');

    ctx.session["subscriptionType"] = subscriptionType;
});

bot.on('photo', async (ctx) => {
    const chatId = ctx.chat.id;
    const photoId = ctx.message.photo[0].file_id;

    const managerChatId = '';

    const date = new Date();
    const dateTimeString = date.toLocaleString();

    const { id, first_name, last_name, username } = ctx.message.from;
    const nickname = `@${username}`;

    const subscriptionType = ctx.session.subscriptionType || '';

    const messageText = `Новая заявка от пользователя:\n\nID: ${id}\nИмя: ${first_name} ${last_name}\nUsername: ${nickname}\nДата/время: ${dateTimeString}\nТип подписки: ${subscriptionType}`;

    await ctx.reply('Спасибо! Ваша заявка на рассмотрении. Если оплата прошла успешно, вам напишет менеджер и предоставит доступ.');

    await ctx.telegram.sendPhoto(managerChatId, photoId);
    await ctx.telegram.sendMessage(managerChatId, messageText);

    const groupChatId = '';
    await sendGroupButtons(groupChatId, chatId, subscriptionType, id);
});

bot.action(/^(yes|no)_(.*)$/, async (ctx) => {
    const action = ctx.match[0];
    const userChatId = parseInt((action.split('_')[1]).split(" ")[0]);
    const type = (action.split('_')[1]).split(" ")[1]

    if (action.startsWith('yes')) {
        await ctx.telegram.sendMessage(userChatId, ("Ваш тариф " + type + " подключилься!"));

        const currentDate = new Date(); // Текущая дата``
        const endingDate = new Date(currentDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // Текущая дата + 30 дней
        const formattedEndingDate = endingDate;
        const values_now = [currentDate]
        const values_end = [formattedEndingDate]

        await client`UPDATE usersAiBot SET tarif_plan = ${type} WHERE user_id = ${userChatId}`;
        await client`UPDATE usersAiBot SET date_buy = ${values_now} WHERE user_id = ${userChatId}`;
        await client`UPDATE usersAiBot SET date_ending = ${values_end} WHERE user_id = ${userChatId}`;

        if (type == "light"){
            await client`UPDATE usersAiBot SET count_queries = 5 WHERE user_id = ${userChatId}`;
            await client`UPDATE usersAiBot SET count_tokens = 14000 WHERE user_id = ${userChatId}`;
        }

        if (type == "medium"){
            await client`UPDATE usersAiBot SET count_queries = 10 WHERE user_id = ${userChatId}`;
            await client`UPDATE usersAiBot SET count_tokens = 25000 WHERE user_id = ${userChatId}`;
        }

        if (type == "ultra"){
            await client`UPDATE usersAiBot SET count_queries = 30 WHERE user_id = ${userChatId}`;
            await client`UPDATE usersAiBot SET count_tokens = 40000 WHERE user_id = ${userChatId}`;
        }
        console.log(type)

    } else if (action.startsWith('no')) {
        await ctx.telegram.sendMessage(userChatId, 'Что-то пошло не так!');
    }
});

async function sendGroupButtons(chatId, userChatId, subscriptionType, id) {
    const ker = userChatId + " " + subscriptionType;
    console.log(ker)
    await bot.telegram.sendMessage(chatId, `Была отправлена заявка на рассмотрение. Тип подписки: ${subscriptionType}. Подтвердить?`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Да', callback_data: `yes_${ker}` }],
                [{ text: 'Нет', callback_data: `no_${userChatId}` }]
            ]
        }
    });
}

bot.launch({
    dropPendingUpdates: true,
    allowedUpdates: ['message', 'callback_query']
}).then(() => {
    console.log('Бот запущен');
}).catch((err) => {
    console.error('Ошибка при запуске бота:', err);
});
