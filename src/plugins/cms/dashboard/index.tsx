import { Button, defineDashboardExtension, Page, PageBlock, PageLayout, PageTitle } from '@vendure/dashboard';
import { articleList } from './article-list';
import { articleDetail } from './article-detail';

defineDashboardExtension({
    routes: [
        articleList,
        articleDetail,
    ],
});
