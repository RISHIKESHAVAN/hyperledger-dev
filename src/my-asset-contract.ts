/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { MyAsset } from './my-asset';

@Info({title: 'MyAssetContract', description: 'My Smart Contract' })
export class MyAssetContract extends Contract {

    // @Transaction() decorator indicates that this method can be called 
    // to generate a transaction response for this smart contract.
    // @Transaction(false) indicates that it only reads from the ledger
    // @Transaction(true) means that it can also write to the ledger
    // Context object is used by the smart contract to maintain user data across contract
    // This method returns true or false depending on whether `myAssetId`
    // was in the ledger.
    @Transaction(false)
    @Returns('boolean')
    public async myAssetExists(ctx: Context, myAssetId: string): Promise<boolean> {
        // Each method uses the world state to read the current value of a set of 
        // business objects and generate the corresponding new values for those 
        // objects. The Context object (ctx) gives you direct access to the world state
        const data: Uint8Array = await ctx.stub.getState(myAssetId);
        return (!!data && data.length > 0);
    }

    @Transaction()
    public async createMyAsset(ctx: Context, myAssetId: string, value: string): Promise<void> {
        const exists: boolean = await this.myAssetExists(ctx, myAssetId);
        if (exists) {
            throw new Error(`The my asset ${myAssetId} already exists`);
        }
        const myAsset: MyAsset = new MyAsset();
        myAsset.value = value;
        const buffer: Buffer = Buffer.from(JSON.stringify(myAsset));
        // The putState method changes the current value of a business object 
        // with the key myAssetId to the value buffer. 
        await ctx.stub.putState(myAssetId, buffer);
        const eventPayload: Buffer = Buffer.from(`Created asset ${myAssetId} (${value})`);
        ctx.stub.setEvent('myEvent', eventPayload);
    }

    @Transaction(false)
    @Returns('MyAsset')
    public async readMyAsset(ctx: Context, myAssetId: string): Promise<MyAsset> {
        const exists: boolean = await this.myAssetExists(ctx, myAssetId);
        if (!exists) {
            throw new Error(`The my asset ${myAssetId} does not exist`);
        }
        const data: Uint8Array = await ctx.stub.getState(myAssetId);
        const myAsset: MyAsset = JSON.parse(data.toString()) as MyAsset;
        return myAsset;
    }

    @Transaction()
    public async updateMyAsset(ctx: Context, myAssetId: string, newValue: string): Promise<void> {
        const exists: boolean = await this.myAssetExists(ctx, myAssetId);
        if (!exists) {
            throw new Error(`The my asset ${myAssetId} does not exist`);
        }
        const myAsset: MyAsset = new MyAsset();
        myAsset.value = newValue;
        const buffer: Buffer = Buffer.from(JSON.stringify(myAsset));
        await ctx.stub.putState(myAssetId, buffer);
    }

    @Transaction()
    public async deleteMyAsset(ctx: Context, myAssetId: string): Promise<void> {
        const exists: boolean = await this.myAssetExists(ctx, myAssetId);
        if (!exists) {
            throw new Error(`The my asset ${myAssetId} does not exist`);
        }
        await ctx.stub.deleteState(myAssetId);
    }

    @Transaction(false)
    public async queryAllAssets(ctx: Context): Promise<string> {
        const startKey = '000';
        const endKey = '999';
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        const allResults = [];
        while (true) {
            const res = await iterator.next();
            if (res.value && res.value.value.toString()) {
                console.log(res.value.value.toString());

                const Key = res.value.key;
                let Record;
                try {
                    Record = JSON.parse(res.value.value.toString());
                } catch (err) {
                    console.log(err);
                    Record = res.value.value.toString();
                }
                allResults.push({ Key, Record });
            }
            if (res.done) {
                console.log('end of data');
                await iterator.close();
                console.info(allResults);
                return JSON.stringify(allResults);
            }
        }
    }

}
