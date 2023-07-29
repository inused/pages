# Cloudflare Pages

> 用于 Cloudflare Pages 部署

## 企业微信

> 支持向企业微信发送消息

### 一、Cloudflare配置

创建pages应用可查看[Cloudflare Docs](https://developers.cloudflare.com/pages/),或自行搜索创建应用的教程
* 菜单路径 `Workers & Pages` > `Overview` > `Create application` > `pages` > `Connect to Git` > 后续根据页面提示进行即可(绑定Github账号后选择仓库、设置分支等)
* 进入新建的page应用详情后，进入 `Settings` > `Branch & deployments`
  * `Branch deployments` 区域可设置生产环境、预览环境，以及对应的分支
  * `Build configurations` 设置编译选项，由于当前没有前端框架，几个输入框全部清空即可
* 进入新建的page应用详情后，进入 `Settings` > `Environment variables`,添加以下环境变量
  ```
  WEB_TOKEN: 为了安全,在实际调用接口时添加一个token参数用于简单的认证,配置此项,调用接口时在url中拼接 `cf_token` 参数
  ```
* 为pages应用绑定KV存储
  * 菜单路径 `Workers & Pages` > `KV` > `Create a namespace`,填写名称后创建
  * 进入新建的page应用详情后，进入 `Settings` > `Functions` > `KV namespace bindings`,添加绑定信息(生产环境和预览环境用到哪个就设置哪个)
    * `Variable name`部分填入`pagesKV`
    * `KV namespace`部分选择4.1新建的 KV

### 二、企业微信

#### 注册企业微信及应用

* 可查看[企业微信帮助中心-注册](https://open.work.weixin.qq.com/help2/pc/15422)部分，注册企业(无需认证，个人使用完全足够)。
* 查看[企业微信帮助中心-自建应用](https://open.work.weixin.qq.com/help2/pc/17693)部分，在新建的企业中创建新应用。
* 在[企业信息](https://work.weixin.qq.com/wework_admin/frame#profile)页面最下方可获取`企业ID`
* 在[应用管理](https://work.weixin.qq.com/wework_admin/frame#apps)页面找到新建的应用，点击进入详情后可找到`应用ID(AgentId)`和`应用Secret(Secret)`
* 在[通讯录](https://work.weixin.qq.com/wework_admin/frame#contacts)页面中找到想要接收消息的成员，点击进入成员详情后可在页面上方找到`账号`

需要配置以下环境变量
```
Wechat_corpid: 企业微信的企业ID
Wechat_agentId: 企业微信中自建应用的应用ID
Wechat_corpsecret: 企业微信中自建应用的应用Secret
Wechat_touser: 默认接收消息的用户,可在调用接口时自行指定 touser 参数覆盖
```

#### 使用

> 接口地址 `https://{你的pages应用名}.pages.dev/wechat?cf_token={刚才在环境变量中配置的WEB_TOKEN}&msgtype={本次发送消息的类型,默认text}`

> 当前仅实现了三种类型的消息 [文本消息text](https://developer.work.weixin.qq.com/document/path/90236#%E6%96%87%E6%9C%AC%E6%B6%88%E6%81%AF) [文本卡片消息textcard](https://developer.work.weixin.qq.com/document/path/90236#%E6%96%87%E6%9C%AC%E5%8D%A1%E7%89%87%E6%B6%88%E6%81%AF) [markdown消息markdown](https://developer.work.weixin.qq.com/document/path/90236#markdown%E6%B6%88%E6%81%AF)
>
> 可在 `functions/components/WeChat.js` 文件中 `export default {}` 部分自行添加其他类型的消息
>
> 每种消息类型需要的参数可直接查看`functions/components/WeChat.js` 文件中 `export default {}` 部分

1. GET方式: 在接口地址后面拼接相应参数即可
2. POST方式: 请求体使用json字符串传入接口