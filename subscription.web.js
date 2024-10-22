import { Permissions, webMethod } from "wix-web-module";
import { orders } from "wix-pricing-plans-backend";

export const getUserActiveOrders = webMethod(
    Permissions.Anyone,
    async (id) => {
        try {

            let myFilter = {
                orderStatuses: ['ACTIVE'],
                buyerIds: id
            }
            const listedOrders = await orders.listOrders(myFilter, null, null, { suppressAuth: true });

            console.log("listedOrders from backend")
            console.log(listedOrders)

            return listedOrders;
        } catch (error) {
            console.error(error);
        }
    },
);