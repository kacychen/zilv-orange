exports.main = async (event, context) => {
  return { openid: context.WXCONTEXT.OPENID };
};
