const { validateToken } = require("../services/authentication");

function checkForAuhtenticationCookie(cookieName) {
    return (req, res, next) => {
        const tokenCookieVal = req.cookies[cookieName];

        if (!tokenCookieVal) {
            return next();
        }

        try {
            const userPayload = validateToken(tokenCookieVal);
            req.user = userPayload;
        } catch (error) {
            console.error(error);
        }

        return next();
    };
}

module.exports = {
    checkForAuhtenticationCookie,
};