﻿import { ModalHelper } from 'olive/components/modal'

export default class BoardComponents implements IService {
    private urlList: string[];
    private boardItemId: string = null;
    private boardType: string = null;
    private filterInput: JQuery;
    private modalHelper: ModalHelper
    private timer: any = null
    constructor(private input: JQuery, modalHelper: ModalHelper) {
        if (input == null || input.length == 0) return;
        var urls = input.attr("data-board-source").split(";");
        this.filterInput = this.input.parent().find(".board-components-filter");
        this.createSearchComponent(urls);
        this.filterEnable()
        this.modalHelper = modalHelper;
    }
    private filterEnable() {
        this.filterInput.off("keyup.board-components-filter").on("keyup.board-components-filter",
            function () {
                if (this.timer != null && this.timer != undefined)
                    clearTimeout(this.timer)
                setTimeout(function () {
                    window.page.board.onChanged()
                }, 200)
            }
        );

        this.filterInput.on("keydown", e => {
            if (e.keyCode == 13) e.preventDefault();
        });
    }
    private onChanged(event: any) {
        this.filterInput = this.filterInput || $(event.currentTarget);
        let keywords = this.filterInput.val().toLowerCase().split(' ');
        let rows = $(".hub-service").find('.board-components-result .item,.olive-instant-search-item');
        rows.each((index, e) => {
            let row = $(e);
            let content = row.text().toLowerCase();
            let hasAllKeywords = keywords.filter((i) => content.indexOf(i) == -1).length == 0;
            if (hasAllKeywords) row.show(); else row.hide();
            if (index == (rows.length - 1))
                window.page.board.onResize()
        });
    }

    protected getResultPanel() {
        const boardPanel = this.input.parent();
        let resultPanel = boardPanel.find(".board-components-result");

        if (resultPanel === undefined || resultPanel === null || resultPanel.length === 0) {
            resultPanel = $("<div class='board-components-result'>");
            boardPanel.append(resultPanel);
        }
        else {
            resultPanel.show();
        }

        return resultPanel;
    }
    protected getAddableItemsPanel() {
        const boardPanel = this.input.parent();
        let resultPanel = boardPanel.find(".board-addable-items-container");

        if (resultPanel === undefined || resultPanel === null || resultPanel.length === 0) {
            resultPanel = $("<div class='board-addable-items-container'>");
            boardPanel.append(resultPanel);
        }
        // else {
        //     resultPanel.show();
        // }

        return resultPanel;
    }

    protected createSearchComponent(urls: string[]) {
        this.boardItemId = this.input.attr("data-id");
        this.boardType = this.input.attr("data-boardtype");

        const resultPanel = this.getResultPanel();
        const addableItemsPanel = this.getAddableItemsPanel();
        resultPanel.empty();
        addableItemsPanel.empty();

        const boardHolder = $("<div class='list-items'>");
        const addabledItemsHolder = $("<div class='list-items'>");


        const ajaxList = urls.map((p): IAjaxObject => {
            const icon = p.split("#")[1].trim();
            return {
                url: p.split("#")[0].trim(),
                icon,
                state: AjaxState.pending,
            };
        });

        const context: IBoardContext = {
            ajaxList,
            ajaxCallCount: 0,
            resultCount: 0,
            resultPanel,
            addableItemsPanel,
            boardHolder: boardHolder,
            addabledItemsHolder: addabledItemsHolder,
            beginSearchStarted: true,
            boardItemId: this.boardItemId,
            boardType: this.boardType,
        };

        for (const ajaxObject of context.ajaxList) {
            ajaxObject.ajx = $
                .ajax({
                    dataType: "json",
                    url: ajaxObject.url,
                    xhrFields: { withCredentials: true },
                    async: true,
                    data: { boardItemId: context.boardItemId, boardType: context.boardType },
                    success: (result) => this.onSuccess(ajaxObject, context, result),
                    complete: (jqXhr) => this.onComplete(context, jqXhr),
                    error: (jqXhr) => this.onError(ajaxObject, context.boardHolder, jqXhr),
                });
        }
        $(document).click(function (e) {
            if (!$(e.target).closest("a").is($(".manage-button,.add-button")))
                $(".board-addable-items-container,.board-manage-items-container").fadeOut();
        })
        $(window).on('resize', function () {
            this.onResize()
        });
    }
    protected onResize() {
        var width = 0;
        if ($(".sidebarCollapse.collapse").length == 0)
            width += 230;
        if ($("#taskBarCollapse.collapse").length == 0)
            width += 300;
        $(".board-components-result .list-items").masonryGrid({
            'columns': parseInt((($(document).outerWidth() - width) / 300).toString())
        });
    }
    protected createBoardItems(sender: IAjaxObject, context: IBoardContext, items: IResultItemDto[], addableItems: IAddableItemDto[]) {
        if (items.length == 0) return null;
        var table = $("<table>");

        const searchItem = $("<div class='item'>");
        const h3 = $('<h3 >').html(items[0].Type + "s").append(this.createHeaderAction(items[0].Type, addableItems))
        searchItem.append($("<div class='header' " + "' style=\"" + this.addColour(items[0]) + "\">").append(h3))

        //table.append($("<tr>").append($("<th " + "' style=\"" + this.addColour(items[0]) + "\" " + ">")

        for (let i = 0; i < items.length; i++) {
            context.resultCount++;
            table.append(this.createItem(items[i], context));
        }
        searchItem.append($("<div>").append(table))
        return searchItem;
    }
    private getItemType(addableItem: IAddableItemDto) {
        if (addableItem.Type == null || addableItem.Type == '' || addableItem.Type == undefined)
            return addableItem.Name;
        return addableItem.Type;
    }
    protected createHeaderAction(type: String, addableItems: IAddableItemDto[]) {
        const manageFiltered = addableItems.filter((p) => p.ManageUrl != null && p.ManageUrl != undefined && this.getItemType(p) == type);
        const addFiltered = addableItems.filter((p) => p.AddUrl != null && p.AddUrl != undefined && this.getItemType(p) == type);

        const headerAction = $("<div class='header-actions'>")
        if (addFiltered.length > 0) {
            var item = addFiltered[0]
            var attr = "";
            if (item.Action == ActionEnum.Popup)
                attr = "target=\"$modal\"";
            else if (item.Action == ActionEnum.NewWindow)
                attr = "target=\"_blank\"";
            headerAction.append($("<a href='" + item.AddUrl + "' " + attr + ">").append('<i class="fas fa-plus" aria-hidden="true"></i>'));
        }
        if (manageFiltered.length > 0) {
            var item = manageFiltered[0]
            var attr = "";
            if (item.Action == ActionEnum.Popup)
                attr = "target=\"$modal\"";
            else if (item.Action == ActionEnum.NewWindow)
                attr = "target=\"_blank\"";
            headerAction.append($("<a href='" + item.ManageUrl + "'" + attr + ">").append('<i class="fa fa-cog" aria-hidden="true"></i>'));
        }


        return headerAction
    }
    protected createAddableItems(sender: IAjaxObject, context: IBoardContext, items: IAddableItemDto[]) {
        const result = $(".board-addable-items-container");

        for (let i = 0; i < items.length; i++) {
            //context.resultCount++;
            result.append(this.createAddableItem(items[i], context));
        }
        return result;
    }
    protected createManageItems(sender: IAjaxObject, context: IBoardContext, items: IAddableItemDto[]) {
        let result = $(".board-manage-items-container");
        if (result.length == 0) {
            result = $("<div class='board-manage-items-container'>");
            context.resultPanel.parent().append(result);
        }
        for (let i = 0; i < items.length; i++) {
            //context.resultCount++;
            result.append(this.createManageItem(items[i], context));
        }
        return result;
    }
    protected addColour(item: IResultItemDto) {
        if (item.Colour != undefined && item.Colour != null && item.Colour != "")
            return "background-color:" + item.Colour + ";"
        return "background-color:#aaa;";
    }
    protected createItem(item: IResultItemDto, context: IBoardContext) {
        var attr = "";
        if (item.Action == ActionEnum.Popup)
            attr = "target=\"$modal\"";
        else if (item.Action == ActionEnum.NewWindow)
            attr = "target=\"_blank\"";

        return $("<tr>").append($("<td >")
            .append($("<a href='" + item.Url + "' " + attr + " >")
                .append((item.IconUrl === null || item.IconUrl === undefined) ? $("<div class='icon'>") : this.showIcon(item))
                .append($("<div>").append($("<span class=\"board-component-name\">").append(item.Name))
                    .append($("<span>").html(item.Body)))));
    }
    protected createAddableItem(item: IAddableItemDto, context: IBoardContext) {
        var attr = "";
        if (item.Action == ActionEnum.Popup)
            attr = "target=\"$modal\"";
        else if (item.Action == ActionEnum.NewWindow)
            attr = "target=\"_blank\"";
        return $("<div class=\"menu-item\">")
            .append($("<a href='" + item.AddUrl + "' " + attr + "'>")
                .append((item.IconUrl === null || item.IconUrl === undefined) ?
                    $("<div class='icon'>") : this.showIcon(item)
                        .append(item.Name)
                        .append($("<small>")
                            .html(item.Body))));
    }

    protected createManageItem(item: IAddableItemDto, context: IBoardContext) {
        var attr = "";
        if (item.Action == ActionEnum.Popup)
            attr = "target=\"$modal\"";
        else if (item.Action == ActionEnum.NewWindow)
            attr = "target=\"_blank\"";

        return $("<div class=\"menu-item\">")
            .append($("<a href='" + item.ManageUrl + "' " + attr + "'>")
                .append((item.IconUrl === null || item.IconUrl === undefined) ?
                    $("<div class='icon'>") : this.showIcon(item)
                        .append(item.Name)
                        .append($("<small>")
                            .html(item.Body))));
    }
    protected bindAddableItemsButtonClick(context: IBoardContext) {
        context.resultPanel.parent().find(".add-button").off("click").click(function (e) {
            e.preventDefault();
            $(".board-manage-items-container,.board-addable-items-container ").fadeOut();
            $(this).parent().parent().find(".board-addable-items-container")
                .fadeToggle();
        });

        context.resultPanel.parent().find(".manage-button").off("click").click(function (e) {
            e.preventDefault();
            $(".board-manage-items-container,.board-addable-items-container ").fadeOut();
            $(this).parent().parent().find(".board-manage-items-container")
                .fadeToggle();
        });
    }
    protected showIcon(item: any): JQuery {
        if (item.IconUrl.indexOf("fa-") > 0) {
            return $("<div class='icon'>").append($("<i class='" + item.IconUrl + "'></i>"));
        } else {
            return $("<div class='icon'>").append($("<img src='" + item.IconUrl + "'>"));
        }
    }
    protected onSuccess(sender: IAjaxObject, context: IBoardContext, result: IBoardResultDto) {
        sender.result = result.Results;
        if (result !== null && result !== undefined && typeof (result.Results) === typeof ([])) {
            sender.state = AjaxState.success;

            const resultfiltered = result.Results.filter((p) => this.isValidResult(p, context));
            const groupBy = (array, key) => {
                // Return the end result
                return array.reduce((result, currentValue) => {
                    // If an array already present for key, push it to the array. Else create an array and push the object
                    (result[currentValue[key]] = result[currentValue[key]] || []).push(
                        currentValue
                    );
                    // Return the current iteration `result` value, this will be taken as next iteration `result` value and accumulate
                    return result;
                }, {}); // empty object is the initial value for result object
            };

            const personGroupedByType = groupBy(resultfiltered, 'Type');
            var that = this;
            $.each(personGroupedByType, function (element) {

                var filterdResult = resultfiltered.filter((p) => p.Type == element);

                const boardItem = that.createBoardItems(sender, context, filterdResult, result.AddabledItems);
                context.boardHolder.append(boardItem);
            })

            if (resultfiltered.length > 0) {

                context.resultPanel.append(context.boardHolder);
            }
            if (result !== null && result !== undefined && typeof (result.AddabledItems) === typeof ([])) {
                sender.state = AjaxState.success;

                var header = this.filterInput.parent();

                const managefiltered = result.AddabledItems.filter((p) => p.ManageUrl != null && p.ManageUrl != undefined);
                const manageItem = this.createManageItems(sender, context, managefiltered);
                const resultfiltered = result.AddabledItems.filter((p) => p.AddUrl != null && p.AddUrl != undefined);

                const addabledItem = this.createAddableItems(sender, context, resultfiltered);
            }

        } else {
            sender.state = AjaxState.failed;
            console.error("ajax success but failed to decode the response -> wellform expcted response is like this: [{Title:'',Description:'',IconUrl:'',Url:''}] ");
        }
    }
    protected isValidResult(item: IResultItemDto, context: IBoardContext) {
        return true;
    }
    protected onComplete(context: IBoardContext, jqXHR: JQueryXHR) {
        context.ajaxCallCount++;

        if (context.ajaxList.filter((p) => p.state === 0).length === 0) {
            //this.waiting.hide();
            if (context.resultCount === 0) {
                const ulNothing = $("<div class=\"item\">");
                ulNothing.append("<a>").append("<span>").html("Nothing found");
                context.resultPanel.append(ulNothing);
            }
        }
        this.modalHelper.enableLink($(".board-components-result [target='$modal'][href]"));
        //window.page.services.getService("modalHelper").enableLink()
        if (context.ajaxCallCount == context.ajaxList.length) {
            var header = this.filterInput.parent();
            this.bindAddableItemsButtonClick(context);

            window.page.board.onResize();

            if ($(".board-addable-items-container").children().length > 0) {
                $(".add-button").fadeIn();
            }
            if ($(".board-manage-items-container").children().length > 0) {
                $(".manage-button").fadeIn();
            }
        }
    }

    protected onError(sender: IAjaxObject, boardHolder: JQuery, jqXHR: JQueryXHR) {
        sender.state = AjaxState.failed;
        const ulFail = $("<div class=\"item\">");
        ulFail.append($("<a>")
            .html("ajax failed Loading data from source [" + sender.url + "]"));
        boardHolder.append(ulFail);
        console.error(jqXHR);
    }
}

export interface IBoardContext {
    ajaxCallCount: number;
    ajaxList: IAjaxObject[];
    resultPanel: JQuery;
    addableItemsPanel: JQuery;
    resultCount: number;
    boardHolder: JQuery;
    addabledItemsHolder: JQuery;
    beginSearchStarted: boolean;
    boardItemId: string;
    boardType: string;
}
export interface IAjaxObject {
    url: string;
    icon: string;
    state: AjaxState;
    ajx?: JQueryXHR;
    displayMessage?: string;
    result?: IResultItemDto[];
}


export interface IResultItemDto {
    Name: string;
    Type: string;
    Body: string;
    IconUrl: string;
    Action: ActionEnum;
    Url: string;
    Colour: string;
}

export interface IAddableItemDto {
    Name: string;
    Type: string;
    Body: string;
    IconUrl: string;
    AddUrl: string;
    ManageUrl: string;
    Action: ActionEnum;
}
export interface IBoardResultDto {
    Results: IResultItemDto[];
    AddabledItems: IAddableItemDto[];
}

export enum AjaxState {
    pending,
    success,
    failed,
}
export enum ActionEnum {
    Redirect,
    Popup,
    NewWindow,
}

//var boardComponents = new BoardComponents($(".board-components"));
