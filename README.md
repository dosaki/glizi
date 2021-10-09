# Glizi
![logo-small](./static/assets/logo-small.png)

A Zendesk App to integrate your [Zendesk Servicedesk](https://www.zendesk.co.uk/) with [Gitlab Issues](https://gitlab.com/), especially a self-managed one.

Please submit bug reports to [Issues](https://github.com/dosaki/glizi/issues).

[Pull requests are welcome](https://github.com/dosaki/glizi/pulls).

## How it Works
After [configuring Glizi](#configuration), it searches your Gitlab issues via the API for issues with a label that matches `Zendesk:#` where `#` is the number of the issue you're currently viewing.

Similarly, when creating or linking an issue, Glizi will create and apply a label following the same convention as well as links to the original Zendesk ticket at the bottom of the issue description.

## Screenshots:

![Issues linked to a ticket](./images/linked-issues.png)

![Create a new issue from a ticket](./images/create-issue.png)

![Link to issue](./images/link-issue.png)

## Configuration

### Find your Apps in your zendesk admin centre

| Old Interface | New Interface |
|---------------|---------------|
| ![Admin->Apps->Manage](./images/settings1_old-admin.png) | ![Admin Center->Apps and integrations->Apps->Zendesk Support apps](./images/settings1_new-admin.png) |

### Find Glizi to change settings

![Glizi->Change settings](./images/settings2.png)

### Configure the required settings:

The only required settings are `Gitlab API URL` and `Gitlab Token`, everything else has defaults but you might want to change them in order to adapt to your particular Gitlab Issues set up.

![Settings to configure](./images/settings3.png)

